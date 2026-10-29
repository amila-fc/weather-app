import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeatherWatch, WEATHER_WATCH_INTERVAL_MS } from './useWeatherWatch';
import { clearAlerts, useAlerts } from './useAlerts';
import { ActiveLocationProvider, useActiveLocation } from '../state/ActiveLocationContext';
import { weatherApi } from '../api/weatherClient';
import type { WeatherData } from '../api/weatherClient';

vi.mock('../api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);

const weather = (overrides: Partial<WeatherData> = {}): WeatherData => ({
  temperature: 55,
  humidity: 60,
  description: 'Clear',
  apparentTemperature: 53,
  summary: 'Clear skies',
  ...overrides,
});

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ActiveLocationProvider>{children}</ActiveLocationProvider>
    </QueryClientProvider>
  );

  return renderHook(
    () => ({ active: useActiveLocation(), alerts: useAlerts(), watch: useWeatherWatch() }),
    { wrapper },
  );
};

describe('useWeatherWatch', () => {
  beforeEach(() => {
    clearAlerts();
    getWeather.mockReset();
    window.localStorage.clear();
  });

  it('evaluates the first sample and pushes the alerts it raises', async () => {
    getWeather.mockResolvedValue(
      weather({ temperature: 28, frost_warning: true, frost_severity: 'light', frost_advisory: 'Cover plants.' }),
    );

    const { result } = setup();

    await waitFor(() => expect(result.current.alerts.alerts).toHaveLength(1));
    expect(result.current.alerts.alerts[0].type).toBe('frost');
    expect(getWeather).toHaveBeenCalledTimes(1);
  });

  it('re-checks the active location every fifteen minutes', async () => {
    vi.useFakeTimers();
    getWeather.mockResolvedValue(weather());

    const { result } = setup();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getWeather).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEATHER_WATCH_INTERVAL_MS);
    });

    expect(getWeather).toHaveBeenCalledTimes(2);
    expect(result.current.active.location).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it('does not treat a location change as a temperature swing', async () => {
    window.localStorage.setItem(
      'weather-app:notification-preferences:v1',
      JSON.stringify({
        version: 1,
        frost: false,
        extremeTemperature: false,
        significantChange: true,
        browserNotifications: false,
        thresholds: { hotF: 95, coldF: 20, changeF: 10 },
      }),
    );
    getWeather.mockResolvedValueOnce(weather({ temperature: 50 }));
    getWeather.mockResolvedValueOnce(weather({ temperature: 80 }));

    const { result } = setup();
    await waitFor(() => expect(getWeather).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.active.setLocation({ lat: 40.7128, lng: -74.006 });
    });

    await waitFor(() => expect(getWeather).toHaveBeenCalledTimes(2));
    expect(result.current.alerts.alerts).toHaveLength(0);
  });

  it('raises a browser notification when permission is granted', async () => {
    const notifications: string[] = [];
    class FakeNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
      constructor(title: string) {
        notifications.push(title);
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    getWeather.mockResolvedValue(weather({ temperature: 100 }));

    const { result } = setup();

    await waitFor(() => expect(result.current.alerts.alerts).toHaveLength(1));
    expect(notifications).toEqual(['Extreme heat']);
  });
});
