import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, evaluateAlerts } from './alerts';
import type { AlertPreferences, WeatherSample } from './alerts';

const COORDINATES = { lat: 47, lng: 8 };
const NOW = new Date('2026-10-29T12:00:00.000Z');

const preferences = (overrides: Partial<AlertPreferences> = {}): AlertPreferences => ({
  frost: true,
  extremeTemperature: true,
  significantChange: true,
  thresholds: DEFAULT_THRESHOLDS,
  ...overrides,
});

const sample = (overrides: Partial<WeatherSample> = {}): WeatherSample => ({
  temperature: 55,
  ...overrides,
});

describe('evaluateAlerts', () => {
  it('raises a frost alert from the backend fields', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({
        temperature: 28,
        frost_warning: true,
        frost_severity: 'light',
        frost_advisory: 'Cover sensitive plants.',
      }),
      preferences: preferences(),
      now: NOW,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      id: 'frost:47.0000,8.0000:light',
      type: 'frost',
      createdAt: NOW.toISOString(),
      coordinates: COORDINATES,
    });
    expect(alerts[0].body).toContain('light');
    expect(alerts[0].body).toContain('Cover sensitive plants.');
  });

  it('falls back to the temperature when the payload has no frost fields', () => {
    const cold = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 20 }),
      preferences: preferences(),
      now: NOW,
    });
    expect(cold[0].type).toBe('frost');
    expect(cold[0].id).toBe('frost:47.0000,8.0000:moderate');

    const atFreezing = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 32 }),
      preferences: preferences(),
      now: NOW,
    });
    expect(atFreezing).toHaveLength(0);
  });

  it('respects an explicit frost_warning=false', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 20, frost_warning: false }),
      preferences: preferences(),
      now: NOW,
    });

    expect(alerts).toHaveLength(0);
  });

  it('suppresses frost when the preference is off', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 28, frost_warning: true, frost_severity: 'light' }),
      preferences: preferences({ frost: false }),
      now: NOW,
    });

    expect(alerts).toHaveLength(0);
  });

  it('applies the extreme temperature boundaries exactly', () => {
    const heat = (temperature: number) =>
      evaluateAlerts({
        coordinates: COORDINATES,
        current: sample({ temperature }),
        preferences: preferences({ frost: false }),
        now: NOW,
      });

    expect(heat(95)).toHaveLength(0);
    expect(heat(95.1)).toEqual([
      expect.objectContaining({ type: 'extreme-heat', title: 'Extreme heat' }),
    ]);
    expect(heat(20)).toHaveLength(0);
    expect(heat(19.9)).toEqual([
      expect.objectContaining({ type: 'extreme-cold', title: 'Extreme cold' }),
    ]);
  });

  it('uses the configured thresholds', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 85 }),
      preferences: preferences({ frost: false, thresholds: { ...DEFAULT_THRESHOLDS, hotF: 80 } }),
      now: NOW,
    });

    expect(alerts[0].type).toBe('extreme-heat');
    expect(alerts[0].body).toContain('80');
  });

  it('suppresses extreme temperature alerts when the preference is off', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 101 }),
      preferences: preferences({ extremeTemperature: false }),
      now: NOW,
    });

    expect(alerts).toHaveLength(0);
  });

  it('raises one temperature-change alert stating direction and both values', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 66 }),
      previous: sample({ temperature: 54 }),
      preferences: preferences({ frost: false }),
      now: NOW,
    });

    expect(alerts).toEqual([
      expect.objectContaining({
        type: 'temperature-change',
        title: 'Temperature change',
        body: 'Temperature rose from 54°F to 66°F.',
      }),
    ]);
  });

  it('ignores changes below the threshold and the very first sample', () => {
    const smallChange = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 60 }),
      previous: sample({ temperature: 54 }),
      preferences: preferences({ frost: false }),
      now: NOW,
    });
    expect(smallChange).toHaveLength(0);

    const firstSample = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 90 }),
      previous: null,
      preferences: preferences({ frost: false }),
      now: NOW,
    });
    expect(firstSample).toHaveLength(0);
  });

  it('produces nothing for change alerts until the preference is enabled', () => {
    const alerts = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 70 }),
      previous: sample({ temperature: 40 }),
      preferences: preferences({ frost: false, significantChange: false }),
      now: NOW,
    });

    expect(alerts).toHaveLength(0);
  });

  it('keeps ids stable within the hour so a repeated check cannot duplicate an alert', () => {
    const first = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 100 }),
      preferences: preferences({ frost: false }),
      now: new Date('2026-10-29T12:05:00.000Z'),
    });
    const second = evaluateAlerts({
      coordinates: COORDINATES,
      current: sample({ temperature: 101 }),
      preferences: preferences({ frost: false }),
      now: new Date('2026-10-29T12:55:00.000Z'),
    });

    expect(first[0].id).toBe(second[0].id);
  });

  it('scopes ids by location', () => {
    const alerts = evaluateAlerts({
      coordinates: { lat: 10, lng: 20 },
      current: sample({ temperature: 100 }),
      preferences: preferences({ frost: false }),
      now: NOW,
    });

    expect(alerts[0].id.startsWith('extreme-heat:10.0000,20.0000:')).toBe(true);
  });
});
