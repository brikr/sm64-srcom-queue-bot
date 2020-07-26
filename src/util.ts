import {Duration} from 'moment';
import {Run} from './srcom';
import {encode, decode} from 'base62';
import {Flag, FLAGS} from './flags';

/**
 * Converts moment duration to H:MM:SS or MM:SS format
 * @param duration
 */
export function formatDuration(duration: Duration) {
  const hours = Math.floor(duration.asHours());
  const minutes = duration
    .minutes()
    .toString()
    .padStart(hours >= 1 ? 2 : 1, '0');
  const seconds = duration.seconds().toString().padStart(2, '0');
  if (hours >= 1) {
    return `${hours}:${minutes}:${seconds}`;
  } else {
    return `${minutes}:${seconds}`;
  }
}

/**
 * Readable string from run
 * @param run
 */
export function runToString(run: Run) {
  return `${run.category} star in ${formatDuration(run.time)}`;
}

/**
 * Encodes flags to a short base62 hash
 * @param flags
 * @return the hash
 */
export function encodeFlags(flags: Flag[]): string {
  let num = 0;
  for (const flag of flags) {
    num += 1 << flag.index;
  }

  return encode(num);
}

/**
 * Decodes flags from a base62 hash
 * @param flags
 * @return array of flags
 */
export function decodeFlags(hash: string): Flag[] {
  let num = decode(hash);

  if (num > 1 >> FLAGS.length) {
    // funky number given, maybe someone messing with url params
    return [];
  }

  const flags = [];
  let idx = 0;
  while (num > 0) {
    if ((num & 1) === 1) {
      // idx-th bit is a 1
      flags.push(FLAGS[idx]);
    }
    // move to next bit
    num >>= 1;
    idx++;
  }

  return flags;
}
