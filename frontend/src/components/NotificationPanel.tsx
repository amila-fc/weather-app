import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualList } from '../hooks/useVirtualList';
import type { WeatherAlert } from '../utils/alerts';
import { NotificationRow } from './NotificationRow';
import { NotificationSettings } from './NotificationSettings';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Alert rows are two lines plus padding; the estimate only seeds the virtualizer's first measurement. */
const ALERT_ROW_ESTIMATE_PX = 96;

const alertKey = (alert: WeatherAlert) => alert.id;

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

  const { isVirtualized, containerRef, rows, totalSize, onFocusCapture, onBlurCapture } =
    useVirtualList<WeatherAlert, HTMLUListElement>({
      items: alerts,
      estimateSize: ALERT_ROW_ESTIMATE_PX,
      getKey: alertKey,
    });

  const alertsById = useMemo(() => new Map(alerts.map((alert) => [alert.id, alert])), [alerts]);

  // Rows only know their id, so the memoised row keeps referential equality when the list changes.
  const selectRow = useCallback(
    (alertId: string) => {
      const alert = alertsById.get(alertId);
      if (alert) {
        onSelectAlert(alert);
      }
    },
    [alertsById, onSelectAlert],
  );

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
        <ul
          ref={containerRef}
          className={`notification-panel__list${isVirtualized ? ' notification-panel__list--virtual' : ''}`}
          style={isVirtualized ? { height: totalSize } : undefined}
          onFocus={onFocusCapture}
          onBlur={onBlurCapture}
        >
          {rows.map((row) => (
            <NotificationRow
              key={row.key}
              alertId={row.item.id}
              type={row.item.type}
              title={row.item.title}
              body={row.item.body}
              createdAt={row.item.createdAt}
              onSelect={selectRow}
              index={row.index}
              offset={isVirtualized ? row.start : undefined}
              setSize={isVirtualized ? alerts.length : undefined}
            />
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
