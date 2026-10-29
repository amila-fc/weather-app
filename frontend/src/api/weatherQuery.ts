import { useQuery } from '@tanstack/react-query';
import { Coordinates, weatherApi } from './weatherClient';

export const weatherQueryKey = (coordinates: Coordinates) =>
  ['weather', coordinates.lat, coordinates.lng] as const;

/**
 * The single weather query used by the map popup, the map marker and WeatherDisplay, so a clicked point
 * costs one request and every surface reads the same cached result.
 */
export const useWeatherQuery = (coordinates: Coordinates) =>
  useQuery({
    queryKey: weatherQueryKey(coordinates),
    queryFn: () => weatherApi.getWeather(coordinates),
    enabled: Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng),
  });
