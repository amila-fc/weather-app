import { useSyncExternalStore } from 'react';
import type { WeatherAlert } from '../utils/alerts';

export const MAX_ALERTS = 50;

interface AlertsSnapshot {
  alerts: WeatherAlert[];
  readIds: string[];
}

export interface AlertsState {
  alerts: WeatherAlert[];
  unreadCount: number;
  push: (alerts: WeatherAlert[]) => void;
  markAllRead: () => void;
  clear: () => void;
}

// Session-only store: deliberately not persisted, and shared by every caller so the background watcher and the
// bell see the same list without threading a provider through the tree.
let snapshot: AlertsSnapshot = { alerts: [], readIds: [] };
const listeners = new Set<() => void>();

const getSnapshot = (): AlertsSnapshot => snapshot;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const publish = (next: AlertsSnapshot): void => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

/** Appends alerts newest-first, dropping ids that are already listed and capping the session history. */
export function pushAlerts(incoming: WeatherAlert[]): void {
  const known = new Set(snapshot.alerts.map((alert) => alert.id));
  const fresh = incoming.filter((alert) => !known.has(alert.id));
  if (fresh.length === 0) {
    return;
  }
  publish({ ...snapshot, alerts: [...fresh, ...snapshot.alerts].slice(0, MAX_ALERTS) });
}

export function markAllAlertsRead(): void {
  publish({ ...snapshot, readIds: snapshot.alerts.map((alert) => alert.id) });
}

export function clearAlerts(): void {
  publish({ alerts: [], readIds: [] });
}

export function useAlerts(): AlertsState {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const read = new Set(current.readIds);

  return {
    alerts: current.alerts,
    unreadCount: current.alerts.filter((alert) => !read.has(alert.id)).length,
    push: pushAlerts,
    markAllRead: markAllAlertsRead,
    clear: clearAlerts,
  };
}
