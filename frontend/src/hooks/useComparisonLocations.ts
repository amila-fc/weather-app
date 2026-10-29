import { useCallback, useState } from 'react';
import type { Coordinates } from '../api/weatherClient';
import { coordinateKey, isValidCoordinates, normalizeCoordinates } from '../utils/coordinates';

export const MAX_COMPARISON_LOCATIONS = 5;

export type AddLocationResult = 'added' | 'duplicate' | 'limit-reached' | 'invalid';

export interface ComparisonLocation extends Coordinates {
  /** The 4-decimal rounded coordinate pair, so the same location is only ever stored once. */
  id: string;
}

export interface ComparisonLocationsState {
  locations: ComparisonLocation[];
  add: (coordinates: Coordinates) => AddLocationResult;
  remove: (id: string) => void;
  replaceAll: (coordinates: Coordinates[]) => void;
  clear: () => void;
  isFull: boolean;
}

export function toComparisonLocation(coordinates: Coordinates): ComparisonLocation {
  const normalized = normalizeCoordinates(coordinates);
  return { ...normalized, id: coordinateKey(normalized) };
}

export function useComparisonLocations(): ComparisonLocationsState {
  const [locations, setLocations] = useState<ComparisonLocation[]>([]);

  const add = useCallback(
    (coordinates: Coordinates): AddLocationResult => {
      if (!isValidCoordinates(coordinates)) {
        return 'invalid';
      }
      const candidate = toComparisonLocation(coordinates);
      if (locations.some((location) => location.id === candidate.id)) {
        return 'duplicate';
      }
      if (locations.length >= MAX_COMPARISON_LOCATIONS) {
        return 'limit-reached';
      }
      setLocations([...locations, candidate]);
      return 'added';
    },
    [locations],
  );

  const remove = useCallback((id: string) => {
    setLocations((current) => current.filter((location) => location.id !== id));
  }, []);

  const replaceAll = useCallback((next: Coordinates[]) => {
    const unique: ComparisonLocation[] = [];
    for (const coordinates of next) {
      if (!isValidCoordinates(coordinates)) {
        continue;
      }
      const location = toComparisonLocation(coordinates);
      if (unique.some((existing) => existing.id === location.id)) {
        continue;
      }
      unique.push(location);
      if (unique.length === MAX_COMPARISON_LOCATIONS) {
        break;
      }
    }
    setLocations(unique);
  }, []);

  const clear = useCallback(() => setLocations([]), []);

  return {
    locations,
    add,
    remove,
    replaceAll,
    clear,
    isFull: locations.length >= MAX_COMPARISON_LOCATIONS,
  };
}
