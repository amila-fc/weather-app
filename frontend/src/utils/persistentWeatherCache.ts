import type { Coordinates, WeatherData } from '../api/weatherClient';
import { coordinateKey } from './coordinates';

/** One indexed key holds every location, so the number of localStorage reads stays constant. */
export const WEATHER_CACHE_STORAGE_KEY = 'weather-app:weather-cache:v1';
export const WEATHER_CACHE_VERSION = 1;
/** Matches the backend cache TTL: older readings are never served. */
export const WEATHER_CACHE_TTL_MS = 5 * 60_000;
export const WEATHER_CACHE_MAX_LOCATIONS = 20;

export interface CachedWeatherEntry {
  payload: WeatherData;
  savedAt: number;
  lastUsedAt: number;
}

interface CacheStore {
  version: number;
  entries: Record<string, CachedWeatherEntry>;
}

const emptyStore = (): CacheStore => ({ version: WEATHER_CACHE_VERSION, entries: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isExpired = (entry: CachedWeatherEntry, now: number): boolean =>
  now - entry.savedAt >= WEATHER_CACHE_TTL_MS;

const isNumeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** A weather payload is only usable when every field the UI renders survived the JSON round trip. */
const toPayload = (value: unknown): WeatherData | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { temperature, humidity, apparentTemperature, description, summary } = value;
  if (!isNumeric(temperature) || !isNumeric(humidity) || !isNumeric(apparentTemperature)) {
    return null;
  }
  if (typeof description !== 'string') {
    return null;
  }

  const payload: WeatherData = {
    temperature,
    humidity,
    apparentTemperature,
    description,
    summary: typeof summary === 'string' ? summary : '',
  };
  if (value.source === 'nws' || value.source === 'open-meteo' || value.source === 'averaged') {
    payload.source = value.source;
  }
  if (typeof value.frost_warning === 'boolean') {
    payload.frost_warning = value.frost_warning;
  }
  if (
    value.frost_severity === 'none' ||
    value.frost_severity === 'light' ||
    value.frost_severity === 'moderate' ||
    value.frost_severity === 'severe'
  ) {
    payload.frost_severity = value.frost_severity;
  }
  if (typeof value.frost_advisory === 'string') {
    payload.frost_advisory = value.frost_advisory;
  }
  return payload;
};

const toEntry = (value: unknown): CachedWeatherEntry | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { savedAt, lastUsedAt } = value;
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) {
    return null;
  }
  const payload = toPayload(value.payload);
  if (!payload) {
    return null;
  }
  return { payload, savedAt, lastUsedAt: typeof lastUsedAt === 'number' ? lastUsedAt : savedAt };
};

/** Corrupt, legacy or unreadable storage simply disables the feature instead of throwing. */
const readStore = (): CacheStore => {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(WEATHER_CACHE_STORAGE_KEY);
  } catch {
    return emptyStore();
  }
  if (!raw) {
    return emptyStore();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== WEATHER_CACHE_VERSION || !isRecord(parsed.entries)) {
      return emptyStore();
    }
    const entries: Record<string, CachedWeatherEntry> = {};
    for (const [key, value] of Object.entries(parsed.entries)) {
      const entry = toEntry(value);
      if (entry) {
        entries[key] = entry;
      }
    }
    return { version: WEATHER_CACHE_VERSION, entries };
  } catch {
    return emptyStore();
  }
};

const writeStore = (store: CacheStore): void => {
  try {
    window.localStorage.setItem(WEATHER_CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode or a full quota: the cache is best effort, never a reason to break the page.
  }
};

const purgeExpired = (store: CacheStore, now: number): boolean => {
  let changed = false;
  for (const [key, entry] of Object.entries(store.entries)) {
    if (isExpired(entry, now)) {
      delete store.entries[key];
      changed = true;
    }
  }
  return changed;
};

const evictLeastRecentlyUsed = (store: CacheStore): void => {
  const keys = Object.keys(store.entries);
  if (keys.length <= WEATHER_CACHE_MAX_LOCATIONS) {
    return;
  }
  keys
    .sort((a, b) => store.entries[a].lastUsedAt - store.entries[b].lastUsedAt)
    .slice(0, keys.length - WEATHER_CACHE_MAX_LOCATIONS)
    .forEach((key) => {
      delete store.entries[key];
    });
};

/**
 * Returns the unexpired entry for a location and stamps it as most recently used, so eviction keeps the
 * coordinates the user actually revisits. Expired entries are purged on the way through.
 */
export function readCachedWeather(
  coordinates: Coordinates,
  now: number = Date.now(),
): CachedWeatherEntry | null {
  const store = readStore();
  const purged = purgeExpired(store, now);
  const key = coordinateKey(coordinates);
  const entry = store.entries[key];

  if (!entry) {
    if (purged) {
      writeStore(store);
    }
    return null;
  }

  const touched: CachedWeatherEntry = { ...entry, lastUsedAt: now };
  store.entries[key] = touched;
  writeStore(store);
  return touched;
}

/** Stores a fresh reading and keeps the store bounded: expired entries first, then LRU eviction. */
export function writeCachedWeather(
  coordinates: Coordinates,
  payload: WeatherData,
  now: number = Date.now(),
): void {
  const store = readStore();
  purgeExpired(store, now);
  store.entries[coordinateKey(coordinates)] = { payload, savedAt: now, lastUsedAt: now };
  evictLeastRecentlyUsed(store);
  writeStore(store);
}

export function clearCachedWeather(): void {
  try {
    window.localStorage.removeItem(WEATHER_CACHE_STORAGE_KEY);
  } catch {
    // Same as above: a storage that refuses the removal has nothing worth recovering.
  }
}
