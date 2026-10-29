import { describe, expect, it } from 'vitest';
import { getTemperatureBand } from './temperature';
import type { TemperatureBand } from './temperature';

const BAND_CASES: Array<[number, TemperatureBand, string]> = [
  [-10, 'freezing', '#1d4ed8'],
  [31.9, 'freezing', '#1d4ed8'],
  [32, 'cold', '#0891b2'],
  [49.9, 'cold', '#0891b2'],
  [50, 'mild', '#15803d'],
  [69.9, 'mild', '#15803d'],
  [70, 'warm', '#ea580c'],
  [84.9, 'warm', '#ea580c'],
  [85, 'hot', '#dc2626'],
  [120, 'hot', '#dc2626'],
];

describe('getTemperatureBand', () => {
  it.each(BAND_CASES)('maps %d°F to the %s band', (temperature, band, color) => {
    expect(getTemperatureBand(temperature)).toEqual({ band, color });
  });
});
