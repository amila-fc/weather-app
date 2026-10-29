import { useCallback, useState } from 'react';
import type { Coordinates } from '../api/weatherClient';
import { coordinateKey, isValidCoordinates, normalizeCoordinates } from '../utils/coordinates';
import { MAX_COMPARISON_LOCATIONS } from './useComparisonLocations';

export const FAVORITES_STORAGE_KEY = 'weather-app:favorite-combinations:v1';
export const FAVORITES_VERSION = 1;

export interface FavoriteCombination {
  id: string;
  name: string;
  savedAt: string;
  locations: Coordinates[];
}

export type SaveFavoriteResult =
  | 'saved'
  | 'invalid-name'
  | 'invalid-locations'
  | 'duplicate-locations'
  | 'storage-error';

export interface FavoriteCombinationsState {
  favorites: FavoriteCombination[];
  save: (name: string, locations: Coordinates[]) => SaveFavoriteResult;
  load: (id: string) => Coordinates[] | null;
  remove: (id: string) => void;
}

export function useFavoriteCombinations(): FavoriteCombinationsState {
  const [favorites, setFavorites] = useState<FavoriteCombination[]>(readFavorites);

  const persist = useCallback((next: FavoriteCombination[]): boolean => {
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify({ version: FAVORITES_VERSION, combinations: next }),
      );
      setFavorites(next);
      return true;
    } catch {
      // Private mode or a full quota: keep the in-memory list untouched and let the caller explain it.
      return false;
    }
  }, []);

  const save = useCallback(
    (name: string, locations: Coordinates[]): SaveFavoriteResult => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return 'invalid-name';
      }
      if (locations.length < 1 || locations.length > MAX_COMPARISON_LOCATIONS) {
        return 'invalid-locations';
      }
      if (!locations.every(isValidCoordinates)) {
        return 'invalid-locations';
      }

      const normalized = locations.map(normalizeCoordinates);
      const keys = new Set(normalized.map(coordinateKey));
      if (keys.size !== normalized.length) {
        return 'duplicate-locations';
      }

      const favorite: FavoriteCombination = {
        id: newFavoriteId(),
        name: trimmedName,
        savedAt: new Date().toISOString(),
        locations: normalized,
      };
      return persist([favorite, ...favorites]) ? 'saved' : 'storage-error';
    },
    [favorites, persist],
  );

  const load = useCallback(
    (id: string): Coordinates[] | null => {
      const favorite = favorites.find((entry) => entry.id === id);
      return favorite ? favorite.locations.map((location) => ({ ...location })) : null;
    },
    [favorites],
  );

  const remove = useCallback(
    (id: string) => {
      persist(favorites.filter((favorite) => favorite.id !== id));
    },
    [favorites, persist],
  );

  return { favorites, save, load, remove };
}

function newFavoriteId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `favorite-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Reads the stored combinations defensively: a missing, malformed, legacy or partially invalid value yields
 * an empty (or filtered) list instead of breaking the page.
 */
function readFavorites(): FavoriteCombination[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== FAVORITES_VERSION || !Array.isArray(parsed.combinations)) {
      return [];
    }
    return parsed.combinations.flatMap((entry) => {
      const favorite = toFavorite(entry);
      return favorite ? [favorite] : [];
    });
  } catch {
    return [];
  }
}

function toFavorite(entry: unknown): FavoriteCombination | null {
  if (!isRecord(entry)) {
    return null;
  }
  const { id, name, savedAt, locations } = entry;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof savedAt !== 'string') {
    return null;
  }
  if (!Array.isArray(locations)) {
    return null;
  }

  const coordinates: Coordinates[] = [];
  for (const location of locations) {
    if (!isRecord(location)) {
      return null;
    }
    const parsed: Coordinates = { lat: Number(location.lat), lng: Number(location.lng) };
    if (!isValidCoordinates(parsed)) {
      return null;
    }
    coordinates.push(normalizeCoordinates(parsed));
  }
  if (coordinates.length < 1 || coordinates.length > MAX_COMPARISON_LOCATIONS) {
    return null;
  }
  return { id, name, savedAt, locations: coordinates };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
