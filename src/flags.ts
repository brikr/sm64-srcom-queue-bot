import {Run, RunFlag} from './srcom';
import * as moment from 'moment';
import {formatDuration} from './util';

interface Flag {
  code: RunFlag;
  title: string;
  check: (run: Run) => boolean;
  reject: boolean;
  rejectMessage?: string;
}

const FLAGS: Flag[] = [
  {
    code: 'MS',
    title: 'Has milliseconds',
    check: run => {
      // TODO: do not flag if they are below a certain time
      if (run.time.milliseconds() !== 0) {
        return true;
      } else {
        return false;
      }
    },
    reject: true,
    rejectMessage: 'Do not include milliseconds in submissions.',
  },
  {
    code: 'SHOUTOUT',
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
    rejectMessage: 'Platform fields do not match.',
  },
];

export function getFlags(run: Run): RunFlag[] {
  if (run.status === 'rejected') {
    // Don't flag rejected runs
    return [];
  }

  console.debug(`Calculating flags for ${run.id} (${run.category} star in ${formatDuration(run.time)})`);

  const flags = FLAGS.reduce<RunFlag[]>((acc, flag) => {
    if (flag.check(run)) {
      acc.push(flag.code);
    }
    return acc;
  }, []);

  console.debug(`${flags.length} flags found for ${run.id}`);

  return flags;
}
