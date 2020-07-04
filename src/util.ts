import {Duration} from 'moment';

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
