import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationPanel } from './NotificationPanel';
import type { WeatherAlert } from '../utils/alerts';

const MINUTE = 60_000;

const alert = (id: string, overrides: Partial<WeatherAlert> = {}): WeatherAlert => ({
  id,
  type: 'frost',
  title: 'Frost warning',
  body: 'light frost: Cover plants.',
  createdAt: new Date(Date.now() - 5 * MINUTE).toISOString(),
  coordinates: { lat: 47, lng: 8 },
  ...overrides,
});

describe('NotificationPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lists the alerts newest-first with type, title and relative time', () => {
    render(
      <NotificationPanel
        alerts={[alert('new', { title: 'Hard frost warning' }), alert('old', { type: 'extreme-heat', title: 'Extreme heat' })]}
        onMarkAllRead={vi.fn()}
        onSelectAlert={vi.fn()}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Hard frost warning')).toBeInTheDocument();
    expect(screen.getByText('Frost')).toBeInTheDocument();
    expect(screen.getByText('Heat')).toBeInTheDocument();
    expect(screen.getAllByText('5 min ago')).toHaveLength(2);
  });

  it('shows an empty state and marks all read', async () => {
    const onMarkAllRead = vi.fn();
    render(<NotificationPanel alerts={[]} onMarkAllRead={onMarkAllRead} onSelectAlert={vi.fn()} />);

    expect(screen.getByText('No alerts yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('reveals the settings panel on demand', async () => {
    render(<NotificationPanel alerts={[]} onMarkAllRead={vi.fn()} onSelectAlert={vi.fn()} />);

    expect(screen.queryByText('Frost warnings')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByText('Frost warnings')).toBeInTheDocument();
    expect(screen.getByLabelText('Hot above (°F)')).toHaveValue(95);
  });

  it('selects an alert', async () => {
    const onSelectAlert = vi.fn();
    render(<NotificationPanel alerts={[alert('a')]} onMarkAllRead={vi.fn()} onSelectAlert={onSelectAlert} />);

    await userEvent.click(screen.getByRole('button', { name: /frost warning/i }));

    expect(onSelectAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});
