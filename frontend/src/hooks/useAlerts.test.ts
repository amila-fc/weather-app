import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAlerts, MAX_ALERTS, pushAlerts, useAlerts } from './useAlerts';
import type { WeatherAlert } from '../utils/alerts';

const alert = (id: string): WeatherAlert => ({
  id,
  type: 'frost',
  title: 'Frost warning',
  body: 'light frost',
  createdAt: '2026-10-29T12:00:00.000Z',
  coordinates: { lat: 47, lng: 8 },
});

describe('useAlerts', () => {
  beforeEach(() => {
    clearAlerts();
  });

  it('pushes alerts newest-first and counts them as unread', () => {
    const { result } = renderHook(() => useAlerts());

    act(() => {
      pushAlerts([alert('a')]);
      pushAlerts([alert('b')]);
    });

    expect(result.current.alerts.map((entry) => entry.id)).toEqual(['b', 'a']);
    expect(result.current.unreadCount).toBe(2);
  });

  it('dedupes alerts with an id that is already listed', () => {
    const { result } = renderHook(() => useAlerts());

    act(() => {
      pushAlerts([alert('a')]);
      pushAlerts([alert('a')]);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('caps the session history', () => {
    const { result } = renderHook(() => useAlerts());

    act(() => {
      for (let index = 0; index < MAX_ALERTS + 5; index += 1) {
        pushAlerts([alert(`alert-${index}`)]);
      }
    });

    expect(result.current.alerts).toHaveLength(MAX_ALERTS);
  });

  it('marks everything read and clears the session', () => {
    const { result } = renderHook(() => useAlerts());

    act(() => {
      pushAlerts([alert('a'), alert('b')]);
    });
    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.alerts).toHaveLength(2);

    act(() => {
      result.current.clear();
    });
    expect(result.current.alerts).toHaveLength(0);
  });
});
