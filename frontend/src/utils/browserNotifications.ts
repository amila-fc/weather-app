import type { WeatherAlert } from './alerts';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

/**
 * Thin, fully guarded wrapper around the browser Notification API. Every call feature-detects and catches, so
 * jsdom and browsers without notifications degrade to "alerts only in the in-app list" instead of throwing.
 */
function notificationApi(): typeof Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  return window.Notification;
}

export function isSupported(): boolean {
  return notificationApi() !== null;
}

export function permission(): NotificationPermissionState {
  const api = notificationApi();
  return api ? api.permission : 'unsupported';
}

/** Must only be called from a user gesture (bell or settings click), never on mount. */
export async function requestPermission(): Promise<NotificationPermissionState> {
  const api = notificationApi();
  if (!api) {
    return 'unsupported';
  }
  try {
    return await api.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Shows one toast for the alert. The alert id doubles as the tag, so a repeat replaces it instead of stacking. */
export function show(alert: WeatherAlert): boolean {
  const api = notificationApi();
  if (!api || api.permission !== 'granted') {
    return false;
  }
  try {
    new api(alert.title, { body: alert.body, tag: alert.id });
    return true;
  } catch {
    return false;
  }
}
