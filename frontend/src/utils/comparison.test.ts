import { describe, expect, it } from 'vitest';
import { findHighlights } from './comparison';
import type { ComparisonCandidate } from './comparison';

const candidates = (
  values: Array<[string, number | null | undefined, number | null | undefined]>,
): ComparisonCandidate[] =>
  values.map(([id, temperature, humidity]) => ({ id, temperature, humidity }));

const NO_HIGHLIGHTS = { warmest: [], coldest: [], highestHumidity: [], lowestHumidity: [] };

describe('findHighlights', () => {
  it('marks the warmest and coldest temperature and the most and least humid', () => {
    expect(findHighlights(candidates([['a', 40, 90], ['b', 70, 50]]))).toEqual({
      warmest: ['b'],
      coldest: ['a'],
      highestHumidity: ['a'],
      lowestHumidity: ['b'],
    });
  });

  it('marks every tied cell', () => {
    const highlights = findHighlights(candidates([['a', 70, 60], ['b', 70, 60], ['c', 50, 80]]));

    expect(highlights.warmest).toEqual(['a', 'b']);
    expect(highlights.coldest).toEqual(['c']);
    expect(highlights.highestHumidity).toEqual(['c']);
    expect(highlights.lowestHumidity).toEqual(['a', 'b']);
  });

  it('marks nothing for an empty set or a single location', () => {
    expect(findHighlights([])).toEqual(NO_HIGHLIGHTS);
    expect(findHighlights(candidates([['a', 40, 90]]))).toEqual(NO_HIGHLIGHTS);
  });

  it('marks nothing when only one comparable value is available', () => {
    expect(findHighlights(candidates([['a', 40, null], ['b', null, 50]]))).toEqual(NO_HIGHLIGHTS);
  });

  it('compares only the values that are present', () => {
    const highlights = findHighlights(candidates([['a', 40, 60], ['b', 60, null], ['c', null, 80]]));

    expect(highlights.warmest).toEqual(['b']);
    expect(highlights.coldest).toEqual(['a']);
    expect(highlights.highestHumidity).toEqual(['c']);
    expect(highlights.lowestHumidity).toEqual(['a']);
  });
});
