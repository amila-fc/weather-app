import { useState } from 'react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import type { NotificationPermissionState } from '../utils/browserNotifications';
import * as browserNotifications from '../utils/browserNotifications';

const PERMISSION_LABELS: Record<NotificationPermissionState, string> = {
  granted: 'Browser notifications are enabled.',
  default: 'Browser notifications are off until you allow them.',
  denied: 'Browser notifications are blocked in this browser; alerts still appear here.',
  unsupported: 'This browser does not support notifications; alerts still appear here.',
};

export const NotificationSettings: React.FC = () => {
  const { preferences, update, reset } = useNotificationPreferences();
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(
    browserNotifications.permission(),
  );

  const enableBrowserNotifications = async () => {
    const result = await browserNotifications.requestPermission();
    setPermissionState(result);
    update({ browserNotifications: result === 'granted' });
  };

  return (
    <div className="notification-settings">
      <label className="notification-settings__row">
        <input
          type="checkbox"
          checked={preferences.frost}
          onChange={(event) => update({ frost: event.target.checked })}
        />
        Frost warnings
      </label>
      <label className="notification-settings__row">
        <input
          type="checkbox"
          checked={preferences.extremeTemperature}
          onChange={(event) => update({ extremeTemperature: event.target.checked })}
        />
        Extreme temperatures
      </label>
      <label className="notification-settings__row">
        <input
          type="checkbox"
          checked={preferences.significantChange}
          onChange={(event) => update({ significantChange: event.target.checked })}
        />
        Significant temperature changes
      </label>

      <div className="notification-settings__thresholds">
        <label>
          Hot above (°F)
          <input
            type="number"
            value={preferences.thresholds.hotF}
            onChange={(event) => update({ thresholds: { hotF: Number(event.target.value) } })}
          />
        </label>
        <label>
          Cold below (°F)
          <input
            type="number"
            value={preferences.thresholds.coldF}
            onChange={(event) => update({ thresholds: { coldF: Number(event.target.value) } })}
          />
        </label>
        <label>
          Change at least (°F)
          <input
            type="number"
            value={preferences.thresholds.changeF}
            onChange={(event) => update({ thresholds: { changeF: Number(event.target.value) } })}
          />
        </label>
      </div>

      <button type="button" className="notification-settings__enable" onClick={enableBrowserNotifications}>
        Enable browser notifications
      </button>
      <p className="notification-settings__permission">{PERMISSION_LABELS[permissionState]}</p>

      <button type="button" className="notification-settings__reset" onClick={reset}>
        Reset defaults
      </button>
    </div>
  );
};
