import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationPanel } from './NotificationPanel';
import { VIRTUALIZE_THRESHOLD } from '../hooks/useVirtualList';
import { stubVirtualViewport } from '../test/virtualViewport';
import type { WeatherAlert } from '../utils/alerts';

const VIEWPORT_HEIGHT = 320;

const alert = (index: number): WeatherAlert => ({
  id: `alert-${index}`,
  type: 'frost',
  title: `Alert ${index}`,
  body: `Body ${index}`,
  createdAt: new Date().toISOString(),
  coordinates: { lat: 47, lng: 8 },
});

const alerts = (count: number) => Array.from({ length: count }, (_, index) => alert(index));

const renderPanel = (count: number) =>
  render(<NotificationPanel alerts={alerts(count)} onMarkAllRead={vi.fn()} onSelectAlert={vi.fn()} />);

const list = () => screen.getByRole('dialog').querySelector('.notification-panel__list') as HTMLElement;

describe('NotificationPanel virtualization', () => {
  let restoreViewport: () => void;

  beforeEach(() => {
    restoreViewport = stubVirtualViewport(VIEWPORT_HEIGHT);
  });

  afterEach(() => {
    restoreViewport();
  });

  it('renders lists at or below the threshold in full flow', () => {
    renderPanel(VIRTUALIZE_THRESHOLD);

    expect(screen.getAllByRole('listitem')).toHaveLength(VIRTUALIZE_THRESHOLD);
    expect(list()).not.toHaveClass('notification-panel__list--virtual');
    expect(screen.getAllByRole('listitem')[0]).not.toHaveAttribute('aria-setsize');
  });

  it('keeps only a window of rows in the DOM for long lists', () => {
    renderPanel(200);

    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(VIRTUALIZE_THRESHOLD);
    expect(list()).toHaveClass('notification-panel__list--virtual');
  });

  it('labels every virtualized row with its position in the full set', () => {
    renderPanel(200);

    const rows = screen.getAllByRole('listitem');
    rows.forEach((row) => expect(row).toHaveAttribute('aria-setsize', '200'));
    expect(rows[0]).toHaveAttribute('aria-posinset', '1');
    expect(Number(rows[1].getAttribute('aria-posinset'))).toBe(
      Number(rows[0].getAttribute('aria-posinset')) + 1,
    );
  });

  it('renders the next window when the list scrolls', () => {
    renderPanel(200);
    expect(screen.getByText('Alert 0')).toBeInTheDocument();

    const scrollContainer = list();
    scrollContainer.scrollTop = 4000;
    fireEvent.scroll(scrollContainer);

    expect(screen.queryByText('Alert 0')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeLessThan(VIRTUALIZE_THRESHOLD);
  });

  it('keeps keyboard focus on a row that scrolls out of the window', () => {
    renderPanel(200);
    const firstRowButton = screen.getByRole('button', { name: /alert 0/i });
    act(() => {
      firstRowButton.focus();
    });
    expect(firstRowButton).toHaveFocus();

    const scrollContainer = list();
    scrollContainer.scrollTop = 4000;
    fireEvent.scroll(scrollContainer);

    // The pinned row is still mounted, so focus is not dropped on the floor.
    expect(screen.getByRole('button', { name: /alert 0/i })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /alert 0/i }));
  });

  it('selects a row by its id so the memoised row keeps stable props', () => {
    const onSelectAlert = vi.fn();
    render(
      <NotificationPanel alerts={alerts(2)} onMarkAllRead={vi.fn()} onSelectAlert={onSelectAlert} />,
    );

    screen.getByRole('button', { name: /alert 1/i }).click();

    expect(onSelectAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'alert-1' }));
  });
});
