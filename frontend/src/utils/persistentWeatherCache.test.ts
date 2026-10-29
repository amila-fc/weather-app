import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeatherData } from '../api/weatherClient';
import {
  WEATHER_CACHE_MAX_LOCATIONS,
  WEATHER_CACHE_STORAGE_KEY,
  WEATHER_CACHE_TTL_MS,
  clearCachedWeather,
  readCachedWeather,
  writeCachedWeather,
} from './persistentWeatherCache';

const SAN_FRANCISCO = { lat: 37.7749, lng: -122.4194 };
const NEW_YORK = { lat: 40.7128, lng: -74.006 };
const NOW = Date.parse('2026-10-30T12:00:00Z');

const weather = (temperature: number, extra: Partial<WeatherData> = {}): WeatherData => ({
  temperature,
  humidity: 60,
  apparentTemperature: temperature - 2,
  description: 'Clear',
  summary: 'Clear skies',
  ...extra,
});

const readStore = (): { version: number; entries: Record<string, unknown> } =>
  JSON.parse(window.localStorage.getItem(WEATHER_CACHE_STORAGE_KEY) ?? '{}');

describe('persistentWeatherCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    clearCachedWeather();
  });

  it('stores every location under one versioned key using the 4-decimal coordinate key', () => {
    writeCachedWeather(SAN_FRANCISCO, weather(55), NOW);
    writeCachedWeather(NEW_YORK, weather(70), NOW + 1000);

    const store = readStore();
    expect(store.version).toBe(1);
    expect(Object.keys(store.entries)).toEqual(['37.7749,-122.4194', '40.7128,-74.0060']);
    expect(Object.keys(window.localStorage)).toEqual([WEATHER_CACHE_STORAGE_KEY]);
  });

  it('normalises nearly identical coordinates onto the same entry', () => {
    writeCachedWeather({ lat: 47.0000001, lng: 8.0000004 }, weather(55), NOW);

    expect(readCachedWeather({ lat: 47, lng: 8 }, NOW + 1000)?.payload.temperature).toBe(55);
  });

  it('serves an entry inside the TTL and never serves an expired one', () => {
    writeCachedWeather(SAN_FRANCISCO, weather(55), NOW);

    expect(readCachedWeather(SAN_FRANCISCO, NOW + WEATHER_CACHE_TTL_MS - 1)).not.toBeNull();
    expect(readCachedWeather(SAN_FRANCISCO, NOW + WEATHER_CACHE_TTL_MS)).toBeNull();
  });

  it('purges expired entries from storage on read', () => {
    writeCachedWeather(SAN_FRANCISCO, weather(55), NOW);
    writeCachedWeather(NEW_YORK, weather(70), NOW);

    expect(readCachedWeather(SAN_FRANCISCO, NOW + WEATHER_CACHE_TTL_MS + 1)).toBeNull();
    expect(readStore().entries).toEqual({});
  });

  it('purges expired entries on write', () => {
    writeCachedWeather(SAN_FRANCISCO, weather(55), NOW);
    writeCachedWeather(NEW_YORK, weather(70), NOW + WEATHER_CACHE_TTL_MS + 1);

    expect(Object.keys(readStore().entries)).toEqual(['40.7128,-74.0060']);
  });

  it(`keeps at most ${WEATHER_CACHE_MAX_LOCATIONS} locations and evicts the least recently used`, () => {
    for (let index = 0; index < WEATHER_CACHE_MAX_LOCATIONS; index += 1) {
      writeCachedWeather({ lat: index, lng: index }, weather(index), NOW + index);
    }

    // Reading the oldest entry makes it the most recently used one.
    readCachedWeather({ lat: 0, lng: 0 }, NOW + 500);
    writeCachedWeather({ lat: 99, lng: 99 }, weather(99), NOW + 600);

    const keys = Object.keys(readStore().entries);
    expect(keys).toHaveLength(WEATHER_CACHE_MAX_LOCATIONS);
    expect(keys).toContain('0.0000,0.0000');
    expect(keys).not.toContain('1.0000,1.0000');
    expect(keys).toContain('99.0000,99.0000');
  });

  it('ignores corrupt JSON instead of throwing', () => {
    window.localStorage.setItem(WEATHER_CACHE_STORAGE_KEY, '{not json');

    expect(readCachedWeather(SAN_FRANCISCO, NOW)).toBeNull();
    expect(() => writeCachedWeather(SAN_FRANCISCO, weather(55), NOW)).not.toThrow();
    expect(readCachedWeather(SAN_FRANCISCO, NOW)?.payload.temperature).toBe(55);
  });

  it('ignores a legacy or foreign payload shape', () => {
    window.localStorage.setItem(
      WEATHER_CACHE_STORAGE_KEY,
      JSON.stringify({ version: 0, entries: { '37.7749,-122.4194': { savedAt: NOW, payload: weather(55) } } }),
    );
    expect(readCachedWeather(SAN_FRANCISCO, NOW)).toBeNull();

    window.localStorage.setItem(
      WEATHER_CACHE_STORAGE_KEY,
      JSON.stringify({ version: 1, entries: { '37.7749,-122.4194': { savedAt: NOW, payload: { temperature: 'warm' } } } }),
    );
    expect(readCachedWeather(SAN_FRANCISCO, NOW)).toBeNull();
  });

  it('swallows storage errors so the feature simply switches off', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => writeCachedWeather(SAN_FRANCISCO, weather(55), NOW)).not.toThrow();
    setItem.mockRestore();

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readCachedWeather(SAN_FRANCISCO, NOW)).toBeNull();
    getItem.mockRestore();
  });

  it('keeps the optional provider fields through a round trip', () => {
    writeCachedWeather(
      SAN_FRANCISCO,
      weather(30, {
        source: 'averaged',
        frost_warning: true,
        frost_severity: 'light',
        frost_advisory: 'Cover plants.',
      }),
      NOW,
    );

    const entry = readCachedWeather(SAN_FRANCISCO, NOW);
    expect(entry?.payload).toMatchObject({
      source: 'averaged',
      frost_warning: true,
      frost_severity: 'light',
      frost_advisory: 'Cover plants.',
    });
    expect(entry?.savedAt).toBe(NOW);
  });
});
