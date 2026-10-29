import { useQuery } from '@tanstack/react-query';
import type { CachedWeatherEntry } from '../utils/persistentWeatherCache';
import { readCachedWeather, writeCachedWeather } from '../utils/persistentWeatherCache';
import type { Coordinates, WeatherData } from './weatherClient';
import { weatherApi } from './weatherClient';

export const weatherQueryKey = (coordinates: Coordinates) =>
  ['weather', coordinates.lat, coordinates.lng] as const;

/**
 * Every successful fetch refreshes the offline cache; a failed request falls back to the last reading
 * while it is still inside the TTL, so a flaky connection shows "last known" instead of an error.
 */
export const getWeatherWithCacheFallback = async (coordinates: Coordinates): Promise<WeatherData> => {
  try {
    const payload = await weatherApi.getWeather(coordinates);
    writeCachedWeather(coordinates, payload);
    return payload;
  } catch (error) {
    const cached = readCachedWeather(coordinates);
    if (!cached) {
      throw error;
    }
    return { ...cached.payload, fromLocalCache: true };
  }
};

/**
 * Query options shared by `useQuery` and `useQueries`, so the map popup, WeatherDisplay and the comparison
 * table all read the same `['weather', lat, lng]` cache entry: one request per location, never duplicated.
 *
 * A stored reading seeds `initialData`, and `initialDataUpdatedAt` carries its real timestamp so React
 * Query revalidates instead of presenting cached data as fresh.
 */
export const weatherQueryOptions = (coordinates: Coordinates) => {
  let cachedEntry: CachedWeatherEntry | null | undefined;
  const readCached = () => {
    if (cachedEntry === undefined) {
      cachedEntry = readCachedWeather(coordinates);
    }
    return cachedEntry;
  };

  return {
    queryKey: weatherQueryKey(coordinates),
    queryFn: () => getWeatherWithCacheFallback(coordinates),
    enabled: Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng),
    initialData: () => readCached()?.payload,
    initialDataUpdatedAt: () => readCached()?.savedAt ?? 0,
  };
};

export const useWeatherQuery = (coordinates: Coordinates) => useQuery(weatherQueryOptions(coordinates));
