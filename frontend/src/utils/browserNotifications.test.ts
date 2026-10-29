import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSupported, permission, requestPermission, show } from './browserNotifications';
import type { WeatherAlert } from './alerts';

const ALERT: WeatherAlert = {
  id: 'frost:47.0000,8.0000:light',
  type: 'frost',
  title: 'Frost warning',
  body: 'light frost: Cover plants.',
  createdAt: '2026-10-29T12:00:00.000Z',
  coordinates: { lat: 47, lng: 8 },
};

interface FakeNotificationInstance {
  title: string;
  options: NotificationOptions | undefined;
}

const stubNotification = (permissionValue: NotificationPermission) => {
  const instances: FakeNotificationInstance[] = [];
  const requestPermissionMock = vi.fn(async () => permissionValue);

  class FakeNotification {
    static permission = permissionValue;
    static requestPermission = requestPermissionMock;
    constructor(title: string, options?: NotificationOptions) {
      instances.push({ title, options });
    }
  }

  vi.stubGlobal('Notification', FakeNotification);
  return { instances, requestPermissionMock };
};

describe('browserNotifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported when the API is missing', () => {
    expect(isSupported()).toBe(false);
    expect(permission()).toBe('unsupported');
    expect(show(ALERT)).toBe(false);
  });

  it('reads the current permission', () => {
    stubNotification('default');

    expect(isSupported()).toBe(true);
    expect(permission()).toBe('default');
  });

  it('requests permission and reports the outcome', async () => {
    const { requestPermissionMock } = stubNotification('granted');

    await expect(requestPermission()).resolves.toBe('granted');
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
  });

  it('shows a notification tagged with the alert id when granted', () => {
    const { instances } = stubNotification('granted');

    expect(show(ALERT)).toBe(true);
    expect(instances).toEqual([
      { title: 'Frost warning', options: { body: 'light frost: Cover plants.', tag: ALERT.id } },
    ]);
  });

  it('does not show anything when permission is denied', () => {
    const { instances } = stubNotification('denied');

    expect(show(ALERT)).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it('swallows constructor failures instead of breaking the caller', () => {
    vi.stubGlobal(
      'Notification',
      class {
        static permission: NotificationPermission = 'granted';
        constructor() {
          throw new Error('blocked');
        }
      },
    );

    expect(show(ALERT)).toBe(false);
  });
});
