import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import { clearAlerts, pushAlerts } from '../hooks/useAlerts';
import type { WeatherAlert } from '../utils/alerts';

const alert = (id: string, overrides: Partial<WeatherAlert> = {}): WeatherAlert => ({
  id,
  type: 'frost',
  title: 'Frost warning',
  body: 'light frost: Cover plants.',
  createdAt: new Date().toISOString(),
  coordinates: { lat: 47, lng: 8 },
  ...overrides,
});

describe('NotificationBell', () => {
  beforeEach(() => {
    clearAlerts();
  });

  it('shows the unread badge and an accessible label', () => {
    act(() => {
      pushAlerts([alert('a'), alert('b')]);
    });

    render(<NotificationBell onSelectAlert={vi.fn()} />);

    const bell = screen.getByRole('button', { name: 'Notifications, 2 unread' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(bell).toHaveTextContent('2');
  });

  it('hides the badge when nothing is unread', () => {
    render(<NotificationBell onSelectAlert={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toHaveTextContent('🔔');
  });

  it('opens the panel and closes it on Escape, returning focus to the bell', async () => {
    render(<NotificationBell onSelectAlert={vi.fn()} />);
    const bell = screen.getByRole('button', { name: /notifications/i });

    await userEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });

  it('closes on an outside click', async () => {
    render(<NotificationBell onSelectAlert={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('resets the badge when everything is marked read', async () => {
    act(() => {
      pushAlerts([alert('a')]);
    });
    render(<NotificationBell onSelectAlert={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /notifications, 1 unread/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /notifications, 0 unread/i })).toBeInTheDocument(),
    );
  });

  it('hands the selected alert to the caller and closes the panel', async () => {
    const onSelectAlert = vi.fn();
    act(() => {
      pushAlerts([alert('a', { title: 'Hard frost warning' })]);
    });
    render(<NotificationBell onSelectAlert={onSelectAlert} />);

    await userEvent.click(screen.getByRole('button', { name: /notifications, 1 unread/i }));
    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    await userEvent.click(within(panel).getByRole('button', { name: /hard frost warning/i }));

    expect(onSelectAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
