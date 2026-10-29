import type { Coordinates } from '../api/weatherClient';

export function roundCoordinate(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinates(coordinates: Coordinates): boolean {
  return isValidLatitude(coordinates.lat) && isValidLongitude(coordinates.lng);
}

export function normalizeCoordinates(coordinates: Coordinates): Coordinates {
  return { lat: roundCoordinate(coordinates.lat), lng: roundCoordinate(coordinates.lng) };
}

/**
 * Identity of a location: the 4-decimal rounded pair, the same key the backend uses for its cache and
 * history rows, so 47.00001 and 47.0 are one location.
 */
export function coordinateKey(coordinates: Coordinates): string {
  const normalized = normalizeCoordinates(coordinates);
  return `${normalized.lat.toFixed(4)},${normalized.lng.toFixed(4)}`;
}

export function formatLocationLabel(coordinates: Coordinates): string {
  const normalized = normalizeCoordinates(coordinates);
  return `${normalized.lat.toFixed(4)}, ${normalized.lng.toFixed(4)}`;
}
