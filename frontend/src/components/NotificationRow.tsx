import { memo, useMemo } from 'react';
import type { AlertType } from '../utils/alerts';
import { formatRelativeTime } from '../utils/format';
import { recordRender } from '../utils/renderCount';

const TYPE_LABELS: Record<AlertType, string> = {
  frost: 'Frost',
  'extreme-heat': 'Heat',
  'extreme-cold': 'Cold',
  'temperature-change': 'Change',
};

export interface NotificationRowProps {
  alertId: string;
  type: AlertType;
  title: string;
  body: string;
  createdAt: string;
  /** Kept stable by the panel; receives the id so this row never has to close over the alert object. */
  onSelect: (alertId: string) => void;
  index: number;
  /** Absolute offset inside a virtualized list. Omitted for plain lists, which flow normally. */
  offset?: number;
  /** Total row count, so virtualized rows can announce their position in the full set. */
  setSize?: number;
}

/**
 * Memoised on purpose: the panel re-renders on every bell toggle and mark-all-read, while an individual
 * alert never changes after it is published.
 */
export const NotificationRow: React.FC<NotificationRowProps> = memo(function NotificationRow({
  alertId,
  type,
  title,
  body,
  createdAt,
  onSelect,
  index,
  offset,
  setSize,
}) {
  recordRender('notification-row');

  const style = useMemo<React.CSSProperties | undefined>(
    () =>
      offset === undefined
        ? undefined
        : { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${offset}px)` },
    [offset],
  );

  return (
    <li
      className="notification-panel__item"
      data-index={index}
      style={style}
      aria-posinset={setSize === undefined ? undefined : index + 1}
      aria-setsize={setSize}
    >
      <button type="button" className="notification-panel__alert" onClick={() => onSelect(alertId)}>
        <span className={`notification-panel__type notification-panel__type--${type}`}>
          {TYPE_LABELS[type]}
        </span>
        <span className="notification-panel__title">{title}</span>
        <span className="notification-panel__time">{formatRelativeTime(createdAt)}</span>
        <span className="notification-panel__body">{body}</span>
      </button>
    </li>
  );
});
