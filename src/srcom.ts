import axios from 'axios';
import * as moment from 'moment';
import {Moment} from 'moment';

const API_BASE = 'https://www.speedrun.com/api/v1';
export const SUPER_MARIO_64 = 'o1y9wo6q';
export const SUPER_MARIO_64_MEMES = 'o1ymwk1q';

interface ApiRuns {
  data: {
    id: string;
    status: {
      status: 'new' | 'verified' | 'rejected';
      examiner: string;
      // If a run is verified, this is the datetime that it was verified
      'verify-date': string;
    };
    // If a run is rejected, then all we have to go off of is the submitted datetime
    submitted: string;
  }[];
  pagination: {
    size: number;
  };
}

interface ApiUser {
  data: {
    id: string;
    names: {
      international: string;
    };
  };
}

export interface Run {
  id: string;
  status: 'new' | 'verified' | 'rejected';
}

export interface ExaminedRun extends Run {
  examiner: string;
  date: Moment;
}

// Get all runs currently in the queue
export async function getAllUnverifiedRuns(
  game: string = SUPER_MARIO_64
): Promise<Run[]> {
  const runs = [];
  let offset = 0;
  let size = 200;
  while (size === 200) {
    // Continue getting runs until we receive fewer than the amount we requested, meaning we hit the last page.
    try {
      const response = await axios.get<ApiRuns>(`${API_BASE}/runs`, {
        params: {
          game,
          status: 'new',
          // Pagination params
          max: 200,
          offset,
        },
      });

      runs.push(response.data.data);

      // Next page
      size = response.data.pagination.size;
      offset += 200;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // Convert ApiRuns[] into Run[]
  return runs.reduce<Run[]>((acc, val) => {
    const mapped = val.map(run => ({
      id: run.id,
      status: run.status.status,
    }));

    return acc.concat(mapped);
  }, []);
}

// Get all runs examined within the past 24 hours
export async function getRecentlyExaminedRuns(
  game: string = SUPER_MARIO_64
): Promise<ExaminedRun[]> {
  const runs = [];
  const minDate = moment().subtract(24, 'h');
  for (const status of ['verified', 'rejected']) {
    let offset = 0;
    let size = 200;
    while (size === 200) {
      // Continue getting runs until we receive fewer than the amount we requested, meaning we hit the last page.
      try {
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
          },
        });

        // Go through runs in this response and add all that are after the minimum date
        let exit = false;
        for (const run of response.data.data) {
          const runDate =
            status === 'verified'
              ? moment(run.status['verify-date'])
              : moment(run.submitted);
          if (runDate.isAfter(minDate)) {
            runs.push({
              id: run.id,
              status: run.status.status,
              examiner: run.status.examiner,
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
        console.error(e);
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
      const response = await axios.get<ApiUser>(`${API_BASE}/users/${id}`);

      examiners[id] = response.data.data.names.international;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // Convert IDs to names
  return runs.map(run => ({
    ...run,
    examiner: examiners[run.examiner],
  }));
}
