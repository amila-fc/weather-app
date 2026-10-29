import { describe, expect, it } from 'vitest';
import {
  coordinateKey,
  formatLocationLabel,
  isValidCoordinates,
  isValidLatitude,
  isValidLongitude,
  normalizeCoordinates,
  roundCoordinate,
} from './coordinates';

describe('roundCoordinate', () => {
  it('rounds to four decimals like the backend cache key', () => {
    expect(roundCoordinate(37.77491234)).toBe(37.7749);
    expect(roundCoordinate(-122.41945678)).toBe(-122.4195);
    expect(roundCoordinate(47.00001)).toBe(47);
  });
});

describe('validators', () => {
  it('accepts only finite values inside the latitude and longitude ranges', () => {
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90.0001)).toBe(false);
    expect(isValidLatitude(Number.NaN)).toBe(false);
    expect(isValidLatitude(Number.POSITIVE_INFINITY)).toBe(false);

    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(-180.5)).toBe(false);
    expect(isValidLongitude(Number.NaN)).toBe(false);

    expect(isValidCoordinates({ lat: 47, lng: 8 })).toBe(true);
    expect(isValidCoordinates({ lat: 100, lng: 8 })).toBe(false);
  });
});

describe('coordinateKey', () => {
  it('treats coordinates that differ below the fourth decimal as one location', () => {
    expect(coordinateKey({ lat: 47, lng: 8 })).toBe(coordinateKey({ lat: 47.00001, lng: 8.00001 }));
    expect(coordinateKey({ lat: 47, lng: 8 })).not.toBe(coordinateKey({ lat: 47.0001, lng: 8 }));
  });
});

describe('normalizeCoordinates and formatLocationLabel', () => {
  it('rounds to four decimals for display and normalization', () => {
    expect(normalizeCoordinates({ lat: 47.00001, lng: -8.50001 })).toEqual({ lat: 47, lng: -8.5 });
    expect(formatLocationLabel({ lat: 47, lng: -8.5 })).toBe('47.0000, -8.5000');
  });
});
