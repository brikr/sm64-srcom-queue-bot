import * as moment from 'moment';
import {formatDuration} from './util';
import {Run} from './srcom';

type FlagCode = 'MS' | 'SHOUTOUT' | 'PLATFORM_MISMATCH' | 'BAD_VERIFIED' | 'NO_REGION';

export interface Flag {
  code: FlagCode;
  index: number;
  title: string;
  check: (run: Run) => boolean;
  reject: boolean;
  rejectMessage?: string;
}

export const FLAGS: Flag[] = [
  {
    code: 'MS',
    index: 0,
    title: 'Has milliseconds',
    check: run => {
      // For Stage RTA, milliseconds are always ok
      if (run.category === 'STAGE') {
        return false;
      }

      // If a run is below this time for these categories, don't auto-reject for milliseconds
      const msOkTimes: {[key: string]: number} = {
        '120': moment.duration({hours: 1, minutes: 39}).asMilliseconds(),
        '70': moment.duration({minutes: 48}).asMilliseconds(),
        '16': moment.duration({minutes: 16}).asMilliseconds(),
        '1': moment.duration({minutes: 7, seconds: 25}).asMilliseconds(),
        '0': moment.duration({minutes: 7}).asMilliseconds(),
      };
      if (run.time.milliseconds() !== 0) {
        const asMs = run.time.asMilliseconds();
        if (msOkTimes[run.category] !== undefined && asMs < msOkTimes[run.category]) {
          // ms are allowed here
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    },
    reject: true,
    rejectMessage:
      'Milliseconds are in the run time. ' +
      'Unless your run is a top time in a short category, you should not include milliseconds in your submission.',
  },
  {
    code: 'SHOUTOUT',
    index: 1,
    title: 'Shoutout worthy',
    check: run => {
      const shoutoutTimes: {[key: string]: number} = {
        '120': moment.duration({hours: 1, minutes: 50}).asMilliseconds(),
        '70': moment.duration({minutes: 51}).asMilliseconds(),
        '16': moment.duration({minutes: 16}).asMilliseconds(),
      };

      if (shoutoutTimes[run.category] === undefined) {
        // Not reporting shoutouts for this category
        return false;
      }

      const asMs = run.time.asMilliseconds();
      if (asMs < shoutoutTimes[run.category]) {
        return true;
      } else {
        return false;
      }
    },
    reject: false,
  },
  {
    code: 'PLATFORM_MISMATCH',
    index: 2,
    title: 'Platform mismatch',
    check: run => {
      switch (run.platform.custom.platform) {
        case 'N64':
          // Submitted to N64 leaderborad. Speedrun.com platform should be N64, not emulated
          if (run.platform.srcom.platform !== 'N64' || run.platform.srcom.emulated) {
            return true;
          }
          break;
        case 'VC':
          // Submitted to VC leaderboard. Speedrun.com platform should be VC, not emulated
          if (run.platform.srcom.platform !== 'VC' || run.platform.srcom.emulated) {
            return true;
          }
          break;
        case 'EMU':
          // Submitted to EMU leaderboard. Speedrun.com platform should be N64, emulated
          if (run.platform.srcom.platform !== 'N64' || !run.platform.srcom.emulated) {
            return true;
          }
      }
      return false;
    },
    reject: true,
    rejectMessage: 'Unsupported combination of Platform fields and Emulator checkbox.',
  },
  {
    code: 'BAD_VERIFIED',
    index: 3,
    title: 'Marked as unverified',
    check: run => {
      return !run.verified;
    },
    reject: true,
    rejectMessage: 'Verified field should be "Yes".',
  },
  {
    code: 'NO_REGION',
    index: 4,
    title: 'Region not provided',
    check: run => {
      return run.region === 'NONE';
    },
    reject: true,
    rejectMessage: 'Region is required.',
  },
];

export function getFlags(run: Run): Flag[] {
  if (run.status === 'rejected') {
    // Don't flag rejected runs
    return [];
  }

  console.debug(`Calculating flags for ${run.id} (${run.category} star in ${formatDuration(run.time)})`);

  const flags = FLAGS.reduce<Flag[]>((acc, flag) => {
    if (flag.check(run)) {
      acc.push(flag);
    }
    return acc;
  }, []);

  console.debug(`${flags.length} flags found for ${run.id}`);

  return flags;
}
