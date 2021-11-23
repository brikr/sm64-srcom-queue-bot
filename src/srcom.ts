import axios from 'axios';
import * as moment from 'moment';
import {Moment, Duration} from 'moment';
import {getFlags, Flag} from './flags';
import {environment} from './environment/environment';
import {runToString} from './util';
import {Logger} from './logger';

interface ApiRun {
  id: string;
  game: string;
  status: {
    status: 'new' | 'verified' | 'rejected';
    examiner: string;
    // If a run is verified, this is the datetime that it was verified
    'verify-date': string;
  };
  players: {
    data: Array<ApiUser>;
  };
  // If a run is rejected, then all we have to go off of is the submitted datetime
  submitted: string;
  category: string;
  times: {
    realtime: string;
    ingame: string;
  };
  system: {
    platform: string;
    emulated: boolean;
    region: string;
  };
  values: {[key: string]: string};
}

interface ApiRuns {
  data: ApiRun[];
  pagination: {
    size: number;
  };
}

interface ApiUser {
  id: string;
  names: {
    international: string;
  };
}

export type Category = '120' | '70' | '16' | '1' | '0' | 'STAGE' | 'MEME';
export type Game = 'sm64' | 'sm64memes';
export type Platform = 'N64' | 'VC' | 'EMU';
export type Region = 'EUR' | 'JPN' | 'USA' | 'NONE';

export interface Run {
  id: string;
  status: 'new' | 'verified' | 'rejected';
  game: Game;
  category: Category;
  time: Duration;
  submitted: Moment;
  players: string[];
  platform: {
    // There are two platform fields on the leaderboard: the speedrun.com specific one that every game has which
    // features platform dropdown  + emulated checkbox, and the SM64 leaderboard specific platforms that are N64, VC,
    // and EMU that are tracked via custom variables.
    srcom: {
      platform: Platform;
      emulated: boolean;
    };
    custom: {
      platform: Platform;
    };
  };
  region: Region;
  verified: boolean;
  flags: Flag[];
}

export interface ExaminedRun extends Run {
  examiner: string;
  date: Moment;
}

const API_BASE = 'https://www.speedrun.com/api/v1';

// Well-known IDs
export const SUPER_MARIO_64 = 'o1y9wo6q';
export const SUPER_MARIO_64_MEMES = 'o1ymwk1q';
const PLATFORM_VARIABLE_ID = 'e8m7em86';
const VERIFIED_VARIABLE_ID = 'kn04ewol';
const CATEGORIES: {[key: string]: Category} = {
  wkpoo02r: '120',
  '7dgrrxk4': '70',
  n2y55mko: '16',
  '7kjpp4k3': '1',
  xk9gg6d0: '0',
};
const PLATFORMS: {[key: string]: Platform} = {
  // speedrun.com platforms
  w89rwelk: 'N64',
  v06dr394: 'VC', // Wii U
  nzelreqp: 'VC', // Wii
  '7m6ylw9p': 'VC', // Switch
  // SM64 custom platforms
  '9qj7z0oq': 'N64',
  jq6540ol: 'VC',
  '5lmoxk01': 'EMU',
};
const VERIFIED_VALUES: {[key: string]: boolean} = {
  '5q8e86rq': true,
  '4qyxop3l': false,
};
const REGIONS: {[key: string]: Region} = {
  e6lxy1dz: 'EUR',
  o316x197: 'JPN',
  pr184lqn: 'USA',
};

// Return the Category based on Game and category ID
function getCategory(game: Game, categoryId: string): Category {
  if (game === 'sm64') {
    // For sm64, it's either a main category or it's stage RTA
    return CATEGORIES[categoryId] || 'STAGE';
  } else {
    // For sm64memes, it's always a meme
    return 'MEME';
  }
}

function mapApiRun(apiRun: ApiRun): Run {
  const game = apiRun.game === SUPER_MARIO_64 ? 'sm64' : 'sm64memes';

  const run: Run = {
    id: apiRun.id,
    game,
    status: apiRun.status.status,
    players: apiRun.players.data.map(x => x.names.international),
    category: getCategory(game, apiRun.category),
    time: moment.duration(apiRun.times.realtime),
    submitted: moment(apiRun.submitted),
    platform: {
      srcom: {
        platform: PLATFORMS[apiRun.system.platform] as Platform,
        emulated: apiRun.system.emulated,
      },
      custom: {
        platform: PLATFORMS[apiRun.values[PLATFORM_VARIABLE_ID]] as Platform,
      },
    },
    region: REGIONS[apiRun.system.region] || 'NONE',
    verified: VERIFIED_VALUES[apiRun.values[VERIFIED_VARIABLE_ID]],
    flags: [],
  };
  run.flags = getFlags(run);
  return run;
}

// Get a run by ID
export async function getRun(id: string): Promise<Run> {
  try {
    Logger.debug(`GET /runs/${id}`);
    const response = await axios.get<{data: ApiRun}>(`${API_BASE}/runs/${id}`, {
      params: {
        embed: 'players',
      },
    });

    return mapApiRun(response.data.data);
  } catch (e) {
    Logger.error(e);
    throw e;
  }
}

// Get all runs currently in the queue
export async function getAllUnverifiedRuns(game: string = SUPER_MARIO_64): Promise<Run[]> {
  Logger.debug(`Getting all unverified runs for ${game}`);
  const runs = [];
  let offset = 0;
  let size = 200;
  while (size === 200) {
    // Continue getting runs until we receive fewer than the amount we requested, meaning we hit the last page.
    try {
      Logger.debug(`GET /runs  offset=${offset}`);
      const response = await axios.get<ApiRuns>(`${API_BASE}/runs`, {
        params: {
          game,
          status: 'new',
          // Pagination params
          max: 200,
          offset,
          embed: 'players',
        },
      });

      runs.push(response.data.data);

      // Next page
      size = response.data.pagination.size;
      offset += 200;
    } catch (e) {
      Logger.error(e);
      throw e;
    }
  }

  // Convert ApiRuns[] into Run[] and calculate flags
  return runs.reduce<Run[]>((acc, val) => {
    const mapped = val.map<Run>(mapApiRun);

    return acc.concat(mapped);
  }, []);
}

// Get all runs examined within the past 24 hours
export async function getRecentlyExaminedRuns(game: string = SUPER_MARIO_64): Promise<ExaminedRun[]> {
  Logger.debug(`Getting all recently verified runs for ${game}`);
  const runs = [];
  const minDate = moment().subtract(24, 'h');
  for (const status of ['verified', 'rejected']) {
    let offset = 0;
    let size = 200;
    while (size === 200) {
      // Continue getting runs until we receive fewer than the amount we requested, meaning we hit the last page.
      try {
        Logger.debug(`GET /runs  offset=${offset}`);
        const response = await axios.get<ApiRuns>(`${API_BASE}/runs`, {
          params: {
            game,
            status,
            // Order params
            orderby: status === 'verified' ? 'verify-date' : 'submitted',
            direction: 'desc',
            // Pagination params
            max: 200,
            offset,
            embed: 'players',
          },
        });

        // Go through runs in this response and add all that are after the minimum date
        let exit = false;
        for (const apiRun of response.data.data) {
          const runDate = status === 'verified' ? moment(apiRun.status['verify-date']) : moment(apiRun.submitted);
          if (runDate.isAfter(minDate)) {
            const run = mapApiRun(apiRun);
            runs.push({
              ...run,
              examiner: apiRun.status.examiner,
              date: runDate,
            });
          } else {
            // We've reached runs that were before the minimum date. Stop paging/processing for this status
            exit = true;
          }
        }
        if (exit) {
          break;
        }

        // If we've made it this far, then we want another page of runs.
        size = response.data.pagination.size;
        offset += 200;
      } catch (e) {
        Logger.error(e);
        throw e;
      }
    }
  }

  // From the runs we've collected, populate a map of unique examiner IDs
  const examiners: {[key: string]: string} = {};
  for (const run of runs) {
    examiners[run.examiner] = '';
  }
  // Populate names for these examiners
  for (const id in examiners) {
    try {
      const response = await axios.get<{data: ApiUser}>(`${API_BASE}/users/${id}`);

      examiners[id] = response.data.data.names.international;
    } catch (e) {
      Logger.error(e);
      throw e;
    }
  }

  // Convert IDs to names
  return runs.map(run => ({
    ...run,
    examiner: examiners[run.examiner],
  }));
}

/**
 * Reject a run with the provided message
 */
export async function rejectRun(run: Run, reason: string) {
  try {
    const response = await axios.put(
      `${API_BASE}/runs/${run.id}/status`,
      {
        status: {
          status: 'rejected',
          reason,
        },
      },
      {
        headers: {
          'x-api-key': environment.srcomApiKey,
        },
      }
    );
    Logger.log({
      type: 'rejection',
      message: `Rejected ${runToString(run)}`,
      reason,
      runLink: `https://speedrun.com/run/${run.id}`,
      run,
      response: response.data,
    });
  } catch (e) {
    const errorData = e.response ? e.response : e.message;
    Logger.error({
      type: 'error',
      message: `Failed to reject run with id ${run.id}`,
      reason,
      runLink: `https://speedrun.com/run/${run.id}`,
      run,
      error: errorData,
    });
  }
}
