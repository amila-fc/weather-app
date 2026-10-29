export interface ComparisonCandidate {
  id: string;
  temperature?: number | null;
  humidity?: number | null;
}

export interface ComparisonHighlights {
  warmest: string[];
  coldest: string[];
  highestHumidity: string[];
  lowestHumidity: string[];
}

const NO_HIGHLIGHTS: ComparisonHighlights = {
  warmest: [],
  coldest: [],
  highestHumidity: [],
  lowestHumidity: [],
};

/**
 * Finds the warmest/coldest and most/least humid locations. Ties highlight every tied cell, and nothing is
 * highlighted for a single location or when values are missing, so the table never marks an uncompared cell.
 */
export function findHighlights(candidates: ComparisonCandidate[]): ComparisonHighlights {
  if (candidates.length < 2) {
    return NO_HIGHLIGHTS;
  }
  return {
    warmest: idsAtExtreme(candidates, (candidate) => candidate.temperature, 'max'),
    coldest: idsAtExtreme(candidates, (candidate) => candidate.temperature, 'min'),
    highestHumidity: idsAtExtreme(candidates, (candidate) => candidate.humidity, 'max'),
    lowestHumidity: idsAtExtreme(candidates, (candidate) => candidate.humidity, 'min'),
  };
}

function idsAtExtreme(
  candidates: ComparisonCandidate[],
  valueOf: (candidate: ComparisonCandidate) => number | null | undefined,
  mode: 'min' | 'max',
): string[] {
  const values = candidates
    .map((candidate) => ({ id: candidate.id, value: valueOf(candidate) }))
    .filter((entry): entry is { id: string; value: number } =>
      typeof entry.value === 'number' && Number.isFinite(entry.value),
    );

  if (values.length < 2) {
    return [];
  }

  const numbers = values.map((entry) => entry.value);
  const target = mode === 'max' ? Math.max(...numbers) : Math.min(...numbers);
  return values.filter((entry) => entry.value === target).map((entry) => entry.id);
}
