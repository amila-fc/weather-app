/**
 * Humidity reaches the UI with full float precision (the averaged providers return e.g. 80.076106174296),
 * so it is rounded once, here, before display.
 */
export function formatHumidity(humidity: number): string {
  return `${Math.round(humidity)}%`;
}

/** Compact "2 min ago" style timestamp for alert rows. */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const elapsedMinutes = Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / 60_000);

  if (elapsedMinutes < 1) {
    return 'just now';
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} h ago`;
  }

  return `${Math.floor(elapsedHours / 24)} d ago`;
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

const DEGREES_PER_COMPASS_POINT = 360 / COMPASS_POINTS.length;
const MILLIS_PER_MINUTE = 60_000;

/** Bearing in degrees (0 = north, 90 = east) as a 16-point compass label. */
export function cardinalDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / DEGREES_PER_COMPASS_POINT) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index];
}

/**
 * Hour tick for a chart, in the location's offset rather than the browser zone — otherwise a user in
 * Tokyo would read a San Francisco series as their own local hours.
 */
export function formatHour(isoTimestamp: string, utcOffsetMinutes: number): string {
  const local = shiftedToOffset(isoTimestamp, utcOffsetMinutes);
  return `${pad(local.getUTCHours())}:00`;
}

/** Wall-clock time such as "7:15 AM", in the location's offset rather than the browser zone. */
export function formatClockInOffset(isoTimestamp: string, utcOffsetMinutes: number): string {
  const local = shiftedToOffset(isoTimestamp, utcOffsetMinutes);
  const hours = local.getUTCHours();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${pad(local.getUTCMinutes())} ${suffix}`;
}

/** Minutes between two instants, rounded; used for the dashboard's day length. */
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / MILLIS_PER_MINUTE);
}

function shiftedToOffset(isoTimestamp: string, utcOffsetMinutes: number): Date {
  // Shift the instant and then read UTC parts, so the browser's own zone never leaks in.
  return new Date(new Date(isoTimestamp).getTime() + utcOffsetMinutes * MILLIS_PER_MINUTE);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "12h 08m" style duration for the sunrise-to-sunset window. */
export function formatMinutesAsHours(minutes: number): string {
  let whole = Math.floor(minutes / 60);
  let rest = Math.round(minutes % 60);
  if (rest === 60) {
    whole += 1;
    rest = 0;
  }
  return `${whole}h ${pad(rest)}m`;
}

