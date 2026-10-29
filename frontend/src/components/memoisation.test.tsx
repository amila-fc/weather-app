import { useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonTable } from './ComparisonTable';
import { NotificationPanel } from './NotificationPanel';
import { TabNav } from './TabNav';
import type { AppTab } from './TabNav';
import { WeatherDisplay } from './WeatherDisplay';
import { weatherApi } from '../api/weatherClient';
import type { WeatherData } from '../api/weatherClient';
import type { ComparisonLocation } from '../hooks/useComparisonLocations';
import { renderCount } from '../utils/renderCount';
import type { WeatherAlert } from '../utils/alerts';

vi.mock('../api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);

const WEATHER: WeatherData = {
  temperature: 55,
  humidity: 60,
  description: 'Clear',
  apparentTemperature: 53,
  summary: 'Clear skies',
};

const LOCATIONS: ComparisonLocation[] = [
  { id: '37.7749,-122.4194', lat: 37.7749, lng: -122.4194 },
  { id: '40.7128,-74.0060', lat: 40.7128, lng: -74.006 },
];

const ALERTS: WeatherAlert[] = [
  {
    id: 'frost:47.0000,8.0000:light',
    type: 'frost',
    title: 'Frost warning',
    body: 'light frost: Cover plants.',
    createdAt: '2026-10-30T10:00:00Z',
    coordinates: { lat: 47, lng: 8 },
  },
];

/** Renders `children` next to a button that re-renders the parent without changing their props. */
const RerenderHarness: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => setCount((current) => current + 1)}>
        unrelated {count}
      </button>
      {children}
    </div>
  );
};

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('memoisation', () => {
  beforeEach(() => {
    getWeather.mockReset();
    getWeather.mockResolvedValue(WEATHER);
  });

  it('leaves the comparison cells untouched when the parent re-renders with identical props', async () => {
    renderWithQueryClient(
      <RerenderHarness>
        <ComparisonTable locations={LOCATIONS} />
      </RerenderHarness>,
    );
    await screen.findAllByText('55°F');

    const before = renderCount('comparison-cell');
    expect(before).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /unrelated/i }));

    expect(renderCount('comparison-cell')).toBe(before);
  });

  it('leaves the notification rows untouched when the panel re-renders with the same alerts', async () => {
    render(
      <RerenderHarness>
        <NotificationPanel alerts={ALERTS} onMarkAllRead={vi.fn()} onSelectAlert={vi.fn()} />
      </RerenderHarness>,
    );

    const before = renderCount('notification-row');
    expect(before).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /unrelated/i }));

    expect(renderCount('notification-row')).toBe(before);
  });

  it('leaves WeatherDisplay untouched when the current-weather tab re-renders', async () => {
    renderWithQueryClient(
      <RerenderHarness>
        <WeatherDisplay latitude={37.7749} longitude={-122.4194} />
      </RerenderHarness>,
    );
    await screen.findByText('55°F');

    const before = renderCount('weather-display');
    expect(before).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /unrelated/i }));

    expect(renderCount('weather-display')).toBe(before);
  });

  it('leaves TabNav untouched while unrelated app state changes', async () => {
    const Harness: React.FC = () => {
      const [activeTab, setActiveTab] = useState<AppTab>('current');
      const selectTab = useCallback((tab: AppTab) => setActiveTab(tab), []);
      return (
        <RerenderHarness>
          <TabNav activeTab={activeTab} onSelect={selectTab} />
        </RerenderHarness>
      );
    };

    render(<Harness />);

    const before = renderCount('tab-nav');
    await userEvent.click(screen.getByRole('button', { name: /unrelated/i }));

    expect(renderCount('tab-nav')).toBe(before);
  });
});
