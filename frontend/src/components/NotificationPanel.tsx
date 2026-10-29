import { useEffect, useRef, useState } from 'react';
import type { AlertType, WeatherAlert } from '../utils/alerts';
import { formatRelativeTime } from '../utils/format';
import { NotificationSettings } from './NotificationSettings';

const TYPE_LABELS: Record<AlertType, string> = {
  frost: 'Frost',
  'extreme-heat': 'Heat',
  'extreme-cold': 'Cold',
  'temperature-change': 'Change',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface NotificationPanelProps {
  alerts: WeatherAlert[];
  onMarkAllRead: () => void;
  onSelectAlert: (alert: WeatherAlert) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  alerts,
  onMarkAllRead,
  onSelectAlert,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Modal-ish popover: focus starts inside and Tab cycles within it (Escape is handled by the bell,
  // which restores focus to the trigger).
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return undefined;
    }

    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.tabIndex !== -1,
      );

    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);

      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      id="notification-panel"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="notification-panel"
    >
      {alerts.length === 0 ? (
        <p className="notification-panel__empty">No alerts yet</p>
      ) : (
        <ul className="notification-panel__list">
          {alerts.map((alert) => (
            <li key={alert.id} className="notification-panel__item">
              <button type="button" className="notification-panel__alert" onClick={() => onSelectAlert(alert)}>
                <span className={`notification-panel__type notification-panel__type--${alert.type}`}>
                  {TYPE_LABELS[alert.type]}
                </span>
                <span className="notification-panel__title">{alert.title}</span>
                <span className="notification-panel__time">{formatRelativeTime(alert.createdAt)}</span>
                <span className="notification-panel__body">{alert.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="notification-panel__footer">
        <button type="button" onClick={onMarkAllRead}>
          Mark all read
        </button>
        <button type="button" onClick={() => setShowSettings((current) => !current)}>
          {showSettings ? 'Hide settings' : 'Settings'}
        </button>
      </div>

      {showSettings && <NotificationSettings />}
    </div>
  );
};
