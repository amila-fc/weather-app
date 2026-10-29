import { useQuery } from '@tanstack/react-query';
import type { Coordinates } from './weatherClient';
import { trendsApi } from './trendsClient';

/** Matches the backend's `weather.trends.default-hours`. */
export const DEFAULT_TRENDS_HOURS = 24;

/** The series is hourly and synthetic while the backend flag is on, so it does not need to be polled often. */
export const TRENDS_STALE_TIME_MS = 15 * 60_000;

export const trendsQueryKey = (coordinates: Coordinates, hours: number) =>
  ['trends', coordinates.lat, coordinates.lng, hours] as const;

/**
 * Shared query options so switching tabs re-reads the cache instead of refetching the series.
 */
export const trendsQueryOptions = (coordinates: Coordinates, hours: number = DEFAULT_TRENDS_HOURS) => ({
  queryKey: trendsQueryKey(coordinates, hours),
  queryFn: () => trendsApi.getTrends(coordinates, hours),
  enabled: Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng),
  staleTime: TRENDS_STALE_TIME_MS,
});

export const useTrendsQuery = (coordinates: Coordinates, hours: number = DEFAULT_TRENDS_HOURS) =>
  useQuery(trendsQueryOptions(coordinates, hours));
