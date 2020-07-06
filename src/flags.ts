import {Run, RunFlag} from './srcom';
import * as moment from 'moment';

export const FLAG_TITLES = {
  MS: 'Has milliseconds',
  SHOUTOUT: 'Shoutout worthy',
  PLATFORM_MISMATCH: 'Platform mismatch',
};

const SHOUTOUT_TIMES = {
  '120': moment.duration({hours: 1, minutes: 50}).asMilliseconds(),
  '70': moment.duration({minutes: 51}).asMilliseconds(),
  '16': moment.duration({minutes: 16}).asMilliseconds(),
  '1': moment.duration({minutes: 8}).asMilliseconds(),
  '0': moment.duration({minutes: 7}).asMilliseconds(),
};

function shoutoutFlag(run: Run): RunFlag | undefined {
  if (run.category === 'MEME') {
    // Nobody gives a shit
    return undefined;
  }

  const asMs = run.time.asMilliseconds();
  if (asMs < SHOUTOUT_TIMES[run.category]) {
    return 'SHOUTOUT';
  }
  return undefined;
}

function msFlag(run: Run): RunFlag | undefined {
  if (run.time.milliseconds() !== 0) {
    return 'MS';
  }
  return undefined;
}

function platformMismatchFlag(run: Run): RunFlag | undefined {
  switch (run.platform.custom.platform) {
    case 'N64':
      // Submitted to N64 leaderborad. Speedrun.com platform should be N64, not emulated
      if (run.platform.srcom.platform !== 'N64' || run.platform.srcom.emulated) {
        return 'PLATFORM_MISMATCH';
      }
      break;
    case 'VC':
      // Submitted to VC leaderboard. Speedrun.com platform should be VC, not emulated
      if (run.platform.srcom.platform !== 'VC' || run.platform.srcom.emulated) {
        return 'PLATFORM_MISMATCH';
      }
      break;
    case 'EMU':
      // Submitted to EMU leaderboard. Speedrun.com platform should be N64, emulated
      if (run.platform.srcom.platform !== 'N64' || !run.platform.srcom.emulated) {
        return 'PLATFORM_MISMATCH';
      }
  }
  return undefined;
}

const flagChecks = [shoutoutFlag, msFlag, platformMismatchFlag];

export function getFlags(run: Run): RunFlag[] {
  if (run.status === 'rejected') {
    // Don't flag rejected runs
    return [];
  }

  console.debug(`Calculating flags for ${run.id} (${run.time.humanize()} ${run.category} run)`);

  const flags = flagChecks.reduce<RunFlag[]>((acc, checkFlag) => {
    const flag = checkFlag(run);
    if (flag !== undefined) {
      acc.push(flag);
    }
    return acc;
  }, []);

  console.debug(`${flags.length} flags found for ${run.id}`);

  return flags;
}
