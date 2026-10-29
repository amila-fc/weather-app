import { useCallback, useState } from 'react';
import type { AlertThresholds } from '../utils/alerts';
import { DEFAULT_THRESHOLDS } from '../utils/alerts';

export const NOTIFICATION_PREFERENCES_KEY = 'weather-app:notification-preferences:v1';
export const NOTIFICATION_PREFERENCES_VERSION = 1;

export interface NotificationPreferences {
  version: number;
  frost: boolean;
  extremeTemperature: boolean;
  significantChange: boolean;
  browserNotifications: boolean;
  thresholds: AlertThresholds;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  version: NOTIFICATION_PREFERENCES_VERSION,
  frost: true,
  extremeTemperature: true,
  significantChange: false,
  browserNotifications: true,
  thresholds: DEFAULT_THRESHOLDS,
};

export type NotificationPreferencesPatch = Partial<
  Pick<NotificationPreferences, 'frost' | 'extremeTemperature' | 'significantChange' | 'browserNotifications'>
> & { thresholds?: Partial<AlertThresholds> };

export interface NotificationPreferencesState {
  preferences: NotificationPreferences;
  update: (patch: NotificationPreferencesPatch) => void;
  reset: () => void;
}

export function useNotificationPreferences(): NotificationPreferencesState {
  const [preferences, setPreferences] = useState<NotificationPreferences>(readPreferences);

  const update = useCallback((patch: NotificationPreferencesPatch) => {
    setPreferences((current) => {
      const next = validate({ ...current, ...patch, thresholds: { ...current.thresholds, ...patch.thresholds } });
      writePreferences(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const defaults = { ...DEFAULT_NOTIFICATION_PREFERENCES, thresholds: { ...DEFAULT_THRESHOLDS } };
    writePreferences(defaults);
    setPreferences(defaults);
  }, []);

  return { preferences, update, reset };
}

/** Keeps the thresholds sane: positive change threshold and coldF strictly below hotF, otherwise defaults. */
export function validate(preferences: NotificationPreferences): NotificationPreferences {
  const thresholds = {
    hotF: finiteOr(preferences.thresholds.hotF, DEFAULT_THRESHOLDS.hotF),
    coldF: finiteOr(preferences.thresholds.coldF, DEFAULT_THRESHOLDS.coldF),
    changeF: finiteOr(preferences.thresholds.changeF, DEFAULT_THRESHOLDS.changeF),
  };
  if (thresholds.changeF <= 0) {
    thresholds.changeF = DEFAULT_THRESHOLDS.changeF;
  }
  if (thresholds.coldF >= thresholds.hotF) {
    thresholds.hotF = DEFAULT_THRESHOLDS.hotF;
    thresholds.coldF = DEFAULT_THRESHOLDS.coldF;
  }
  return {
    version: NOTIFICATION_PREFERENCES_VERSION,
    frost: preferences.frost,
    extremeTemperature: preferences.extremeTemperature,
    significantChange: preferences.significantChange,
    browserNotifications: preferences.browserNotifications,
    thresholds,
  };
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function writePreferences(preferences: NotificationPreferences): void {
  try {
    window.localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Private mode or a full quota: keep the in-memory preferences and carry on.
  }
}

/** Missing, malformed, wrong-version or out-of-range values all fall back to the documented defaults. */
function readPreferences(): NotificationPreferences {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  if (!raw) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    const stored = parsed as Record<string, unknown>;
    if (stored.version !== NOTIFICATION_PREFERENCES_VERSION) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    const storedThresholds =
      typeof stored.thresholds === 'object' && stored.thresholds !== null
        ? (stored.thresholds as Record<string, unknown>)
        : {};

    return validate({
      version: NOTIFICATION_PREFERENCES_VERSION,
      frost: booleanOr(stored.frost, DEFAULT_NOTIFICATION_PREFERENCES.frost),
      extremeTemperature: booleanOr(
        stored.extremeTemperature,
        DEFAULT_NOTIFICATION_PREFERENCES.extremeTemperature,
      ),
      significantChange: booleanOr(stored.significantChange, DEFAULT_NOTIFICATION_PREFERENCES.significantChange),
      browserNotifications: booleanOr(
        stored.browserNotifications,
        DEFAULT_NOTIFICATION_PREFERENCES.browserNotifications,
      ),
      thresholds: {
        hotF: finiteOr(storedThresholds.hotF, DEFAULT_THRESHOLDS.hotF),
        coldF: finiteOr(storedThresholds.coldF, DEFAULT_THRESHOLDS.coldF),
        changeF: finiteOr(storedThresholds.changeF, DEFAULT_THRESHOLDS.changeF),
      },
    });
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
