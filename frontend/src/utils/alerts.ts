import type { Coordinates } from '../api/weatherClient';
import { coordinateKey } from './coordinates';

export type AlertType = 'frost' | 'extreme-heat' | 'extreme-cold' | 'temperature-change';

export type FrostSeverity = 'light' | 'moderate' | 'severe';

export interface AlertThresholds {
  hotF: number;
  coldF: number;
  changeF: number;
}

export interface AlertPreferences {
  frost: boolean;
  extremeTemperature: boolean;
  significantChange: boolean;
  thresholds: AlertThresholds;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = { hotF: 95, coldF: 20, changeF: 10 };

/** The subset of `/api/weather` the alert rules look at. */
export interface WeatherSample {
  temperature: number;
  frost_warning?: boolean;
  frost_severity?: string;
  frost_advisory?: string;
}

export interface WeatherAlert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  createdAt: string;
  coordinates: Coordinates;
}

export interface EvaluateAlertsInput {
  coordinates: Coordinates;
  current: WeatherSample;
  previous?: WeatherSample | null;
  preferences: AlertPreferences;
  now: Date;
}

const FROST_TITLES: Record<FrostSeverity, string> = {
  light: 'Frost warning',
  moderate: 'Hard frost warning',
  severe: 'Severe frost warning',
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Turns one weather sample into the alerts that preferences allow. Pure and deterministic: the same sample and
 * clock always produce the same ids, which is what stops a repeated 15-minute check from spamming the user.
 */
export function evaluateAlerts({
  coordinates,
  current,
  previous,
  preferences,
  now,
}: EvaluateAlertsInput): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const key = coordinateKey(coordinates);
  const createdAt = now.toISOString();
  const hourBucket = Math.floor(now.getTime() / HOUR_MS);

  if (preferences.frost) {
    const severity = frostSeverityOf(current);
    if (severity) {
      alerts.push({
        id: `frost:${key}:${severity}`,
        type: 'frost',
        title: FROST_TITLES[severity],
        body: current.frost_advisory?.trim()
          ? `${severity} frost: ${current.frost_advisory.trim()}`
          : `${severity} frost expected at ${Math.round(current.temperature)}°F.`,
        createdAt,
        coordinates,
      });
    }
  }

  if (preferences.extremeTemperature) {
    if (current.temperature > preferences.thresholds.hotF) {
      alerts.push({
        id: `extreme-heat:${key}:${hourBucket}`,
        type: 'extreme-heat',
        title: 'Extreme heat',
        body: `${current.temperature}°F is above the ${preferences.thresholds.hotF}°F threshold.`,
        createdAt,
        coordinates,
      });
    }
    if (current.temperature < preferences.thresholds.coldF) {
      alerts.push({
        id: `extreme-cold:${key}:${hourBucket}`,
        type: 'extreme-cold',
        title: 'Extreme cold',
        body: `${current.temperature}°F is below the ${preferences.thresholds.coldF}°F threshold.`,
        createdAt,
        coordinates,
      });
    }
  }

  if (preferences.significantChange && previous) {
    const delta = current.temperature - previous.temperature;
    if (Math.abs(delta) >= preferences.thresholds.changeF) {
      const direction = delta > 0 ? 'rose' : 'fell';
      alerts.push({
        id: `temperature-change:${key}:${hourBucket}`,
        type: 'temperature-change',
        title: 'Temperature change',
        body: `Temperature ${direction} from ${Math.round(previous.temperature)}°F to ${Math.round(current.temperature)}°F.`,
        createdAt,
        coordinates,
      });
    }
  }

  return alerts;
}

function frostSeverityOf(sample: WeatherSample): FrostSeverity | null {
  if (sample.frost_warning === false) {
    return null;
  }
  if (sample.frost_warning === true) {
    return asSeverity(sample.frost_severity) ?? severityForTemperature(sample.temperature);
  }
  // Older payloads carry no frost flag: derive it from the temperature.
  return sample.temperature < 32 ? severityForTemperature(sample.temperature) : null;
}

function asSeverity(value?: string): FrostSeverity | null {
  return value === 'light' || value === 'moderate' || value === 'severe' ? value : null;
}

function severityForTemperature(temperature: number): FrostSeverity {
  if (temperature < 15) {
    return 'severe';
  }
  if (temperature < 25) {
    return 'moderate';
  }
  return 'light';
}
