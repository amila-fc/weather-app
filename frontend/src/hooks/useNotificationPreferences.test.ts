import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCES_KEY,
  useNotificationPreferences,
} from './useNotificationPreferences';

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts from the documented defaults', () => {
    const { result } = renderHook(() => useNotificationPreferences());

    expect(result.current.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('persists changes and restores them after a reload', () => {
    const first = renderHook(() => useNotificationPreferences());

    act(() => {
      first.result.current.update({ frost: false, significantChange: true, thresholds: { changeF: 5 } });
    });

    expect(window.localStorage.getItem(NOTIFICATION_PREFERENCES_KEY)).toContain('"changeF":5');

    const afterReload = renderHook(() => useNotificationPreferences());
    expect(afterReload.result.current.preferences.frost).toBe(false);
    expect(afterReload.result.current.preferences.significantChange).toBe(true);
    expect(afterReload.result.current.preferences.thresholds.changeF).toBe(5);
  });

  it('falls back to defaults for corrupt or legacy values', () => {
    window.localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, '{oops');
    expect(renderHook(() => useNotificationPreferences()).result.current.preferences).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );

    window.localStorage.setItem(
      NOTIFICATION_PREFERENCES_KEY,
      JSON.stringify({ version: 99, frost: false, thresholds: { hotF: 1, coldF: 2, changeF: 3 } }),
    );
    expect(renderHook(() => useNotificationPreferences()).result.current.preferences).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
  });

  it('rejects impossible thresholds', () => {
    const { result } = renderHook(() => useNotificationPreferences());

    act(() => {
      result.current.update({ thresholds: { hotF: 10, coldF: 40 } });
    });
    expect(result.current.preferences.thresholds).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.thresholds);

    act(() => {
      result.current.update({ thresholds: { changeF: 0 } });
    });
    expect(result.current.preferences.thresholds.changeF).toBe(
      DEFAULT_NOTIFICATION_PREFERENCES.thresholds.changeF,
    );
  });

  it('keeps working when storage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useNotificationPreferences());

    act(() => {
      result.current.update({ extremeTemperature: false });
    });

    expect(result.current.preferences.extremeTemperature).toBe(false);
  });
});
