import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeatherData } from './weatherClient';
import { weatherApi } from './weatherClient';
import { getWeatherWithCacheFallback, weatherQueryKey, weatherQueryOptions } from './weatherQuery';
import { WEATHER_CACHE_TTL_MS, readCachedWeather, writeCachedWeather } from '../utils/persistentWeatherCache';

vi.mock('./weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);

const COORDINATES = { lat: 37.7749, lng: -122.4194 };

const weather = (temperature: number): WeatherData => ({
  temperature,
  humidity: 60,
  apparentTemperature: temperature - 2,
  description: 'Clear',
  summary: 'Clear skies',
});

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('weatherQuery', () => {
  beforeEach(() => {
    getWeather.mockReset();
    window.localStorage.clear();
  });

  it('keys the query by the raw coordinates, matching the shared weather cache entry', () => {
    expect(weatherQueryKey(COORDINATES)).toEqual(['weather', 37.7749, -122.4194]);
  });

  it('writes every successful fetch to the offline cache', async () => {
    getWeather.mockResolvedValue(weather(55));

    const data = await getWeatherWithCacheFallback(COORDINATES);

    expect(data.temperature).toBe(55);
    expect(data.fromLocalCache).toBeUndefined();
    expect(readCachedWeather(COORDINATES)?.payload.temperature).toBe(55);
  });

  it('falls back to a non-expired cached reading when the network fails', async () => {
    writeCachedWeather(COORDINATES, weather(41));
    getWeather.mockRejectedValue(new Error('offline'));

    const data = await getWeatherWithCacheFallback(COORDINATES);

    expect(data.temperature).toBe(41);
    expect(data.fromLocalCache).toBe(true);
  });

  it('rethrows the network error when the cached reading expired', async () => {
    writeCachedWeather(COORDINATES, weather(41), Date.now() - WEATHER_CACHE_TTL_MS - 1);
    getWeather.mockRejectedValue(new Error('offline'));

    await expect(getWeatherWithCacheFallback(COORDINATES)).rejects.toThrow('offline');
  });

  it('rethrows the network error when nothing was cached', async () => {
    getWeather.mockRejectedValue(new Error('offline'));

    await expect(getWeatherWithCacheFallback(COORDINATES)).rejects.toThrow('offline');
  });

  it('seeds the observer with cached data and its real timestamp', async () => {
    const savedAt = Date.now() - 4 * 60_000;
    writeCachedWeather(COORDINATES, weather(38), savedAt);
    getWeather.mockResolvedValue(weather(60));

    const options = weatherQueryOptions(COORDINATES);
    const queryClient = newQueryClient();
    const observer = new QueryObserver(queryClient, options);

    expect(observer.getCurrentResult().data?.temperature).toBe(38);
    expect(observer.getCurrentResult().dataUpdatedAt).toBe(savedAt);

    // Older than the client's staleTime, so React Query revalidates instead of trusting it.
    await queryClient.fetchQuery(options);
    expect(getWeather).toHaveBeenCalledTimes(1);
    expect(readCachedWeather(COORDINATES)?.payload.temperature).toBe(60);
  });

  it('paints without data when the cache is empty', () => {
    expect(weatherQueryOptions(COORDINATES).initialData()).toBeUndefined();
    expect(weatherQueryOptions(COORDINATES).initialDataUpdatedAt()).toBe(0);
  });
});
