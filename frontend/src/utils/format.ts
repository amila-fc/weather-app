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
