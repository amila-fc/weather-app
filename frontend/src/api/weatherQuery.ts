import { useQuery } from '@tanstack/react-query';
import { Coordinates, weatherApi } from './weatherClient';

export const weatherQueryKey = (coordinates: Coordinates) =>
  ['weather', coordinates.lat, coordinates.lng] as const;

/**
 * Query options shared by `useQuery` and `useQueries`, so the map popup, WeatherDisplay and the comparison
 * table all read the same `['weather', lat, lng]` cache entry: one request per location, never duplicated.
 */
export const weatherQueryOptions = (coordinates: Coordinates) => ({
  queryKey: weatherQueryKey(coordinates),
  queryFn: () => weatherApi.getWeather(coordinates),
  enabled: Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng),
});

export const useWeatherQuery = (coordinates: Coordinates) => useQuery(weatherQueryOptions(coordinates));
