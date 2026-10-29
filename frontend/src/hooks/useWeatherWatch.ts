import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { weatherQueryOptions } from '../api/weatherQuery';
import { useActiveLocation } from '../state/ActiveLocationContext';
import { useAlerts } from './useAlerts';
import { useNotificationPreferences } from './useNotificationPreferences';
import { evaluateAlerts } from '../utils/alerts';
import type { WeatherSample } from '../utils/alerts';
import { show as showBrowserNotification } from '../utils/browserNotifications';
import { coordinateKey } from '../utils/coordinates';

export const WEATHER_WATCH_INTERVAL_MS = 15 * 60_000;

/**
 * Re-checks the active location every 15 minutes and turns each new sample into alerts.
 *
 * <p>This is polling, not push: while the tab is closed no check runs, so no alert can fire. The interval is
 * deliberately background-enabled (a check that only ran while the tab was visible could never raise a browser
 * notification), at the cost of one request every 15 minutes per open tab.
 */
export function useWeatherWatch(): void {
  const { location } = useActiveLocation();
  const { preferences } = useNotificationPreferences();
  const { push } = useAlerts();

  const { data, dataUpdatedAt } = useQuery({
    ...weatherQueryOptions(location),
    refetchInterval: WEATHER_WATCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const previousRef = useRef<{ key: string; sample: WeatherSample } | null>(null);
  const evaluatedRef = useRef<number>(0);

  useEffect(() => {
    if (!data || dataUpdatedAt === 0 || dataUpdatedAt === evaluatedRef.current) {
      return;
    }
    // Keyed by dataUpdatedAt so StrictMode double-effects and re-renders evaluate each sample exactly once.
    evaluatedRef.current = dataUpdatedAt;

    const key = coordinateKey(location);
    const previous = previousRef.current?.key === key ? previousRef.current.sample : null;
    const current: WeatherSample = {
      temperature: data.temperature,
      frost_warning: data.frost_warning,
      frost_severity: data.frost_severity,
      frost_advisory: data.frost_advisory,
    };
    previousRef.current = { key, sample: current };

    const alerts = evaluateAlerts({
      coordinates: location,
      current,
      previous,
      preferences,
      now: new Date(),
    });
    if (alerts.length === 0) {
      return;
    }

    push(alerts);
    if (preferences.browserNotifications) {
      alerts.forEach((alert) => {
        showBrowserNotification(alert);
      });
    }
  }, [data, dataUpdatedAt, location, preferences, push]);
}
