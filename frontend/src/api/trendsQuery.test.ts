import { describe, expect, it, vi } from 'vitest';
import { trendsApi } from './trendsClient';
import { DEFAULT_TRENDS_HOURS, TRENDS_STALE_TIME_MS, trendsQueryKey, trendsQueryOptions } from './trendsQuery';

const SAN_FRANCISCO = { lat: 37.7749, lng: -122.4194 };

describe('trendsQuery', () => {
  it('keys the cache by coordinates and window so tabs share one entry', () => {
    expect(trendsQueryKey(SAN_FRANCISCO, 24)).toEqual(['trends', 37.7749, -122.4194, 24]);
    expect(trendsQueryKey(SAN_FRANCISCO, 12)).not.toEqual(trendsQueryKey(SAN_FRANCISCO, 24));
  });

  it('defaults to 24 hours and caches for 15 minutes', () => {
    const options = trendsQueryOptions(SAN_FRANCISCO);

    expect(DEFAULT_TRENDS_HOURS).toBe(24);
    expect(TRENDS_STALE_TIME_MS).toBe(15 * 60_000);
    expect(options.staleTime).toBe(TRENDS_STALE_TIME_MS);
    expect(options.queryKey).toEqual(['trends', 37.7749, -122.4194, 24]);
    expect(options.enabled).toBe(true);
  });

  it('is disabled for coordinates that are not numbers', () => {
    expect(trendsQueryOptions({ lat: Number.NaN, lng: -122.4194 }).enabled).toBe(false);
    expect(trendsQueryOptions({ lat: 37.7749, lng: Number.POSITIVE_INFINITY }).enabled).toBe(false);
  });

  it('asks the client for the requested window', async () => {
    const getTrends = vi.spyOn(trendsApi, 'getTrends').mockResolvedValue({
      latitude: 37.7749,
      longitude: -122.4194,
      generatedAt: '2026-10-30T00:00:00Z',
      mock: true,
      hours: 12,
      utcOffsetMinutes: -480,
      current: {
        temperature: 61.2,
        humidity: 72,
        windSpeedMph: 9.4,
        windDirectionDegrees: 285,
        feelsLikeTemperature: 59.8,
        description: 'Partly cloudy',
      },
      hourly: [],
      sunrise: null,
      sunset: null,
      polar: null,
    });

    const options = trendsQueryOptions(SAN_FRANCISCO, 12);
    await options.queryFn();

    expect(getTrends).toHaveBeenCalledWith(SAN_FRANCISCO, 12);
    getTrends.mockRestore();
  });
});
