import { useEffect, useRef, useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import type { WeatherAlert } from '../utils/alerts';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  onSelectAlert: (alert: WeatherAlert) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onSelectAlert }) => {
  const { alerts, unreadCount, markAllRead } = useAlerts();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const selectAlert = (alert: WeatherAlert) => {
    onSelectAlert(alert);
    setOpen(false);
  };

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell__button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {unreadCount}
          </span>
        )}
      </button>

      <span className="sr-only" role="status" aria-live="polite">
        {unreadCount === 1 ? '1 unread alert' : `${unreadCount} unread alerts`}
      </span>

      {open && (
        <NotificationPanel alerts={alerts} onMarkAllRead={markAllRead} onSelectAlert={selectAlert} />
      )}
    </div>
  );
};
