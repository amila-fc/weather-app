import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeatherTrends } from '../api/trendsClient';
import { trendsApi } from '../api/trendsClient';
import { ActiveLocationProvider } from '../state/ActiveLocationContext';
import { TrendsTab } from './TrendsTab';

vi.mock('../api/trendsClient', () => ({
  trendsApi: { getTrends: vi.fn() },
  default: { getTrends: vi.fn() },
}));

const getTrends = vi.mocked(trendsApi.getTrends);

const hourIso = (index: number) => `2026-10-29T${String(index).padStart(2, '0')}:00:00Z`;

const trends = (overrides: Partial<WeatherTrends> = {}): WeatherTrends => ({
  latitude: 37.7749,
  longitude: -122.4194,
  generatedAt: '2026-10-30T00:00:00Z',
  mock: true,
  hours: 24,
  utcOffsetMinutes: -420,
  current: {
    temperature: 61.2,
    humidity: 72,
    windSpeedMph: 9.4,
    windDirectionDegrees: 285,
    feelsLikeTemperature: 59.8,
    description: 'Partly cloudy',
  },
  hourly: Array.from({ length: 24 }, (_, index) => ({
    time: hourIso(index),
    temperature: 55 + index * 0.5,
    humidity: 70 + (index % 5),
    windSpeedMph: 6 + (index % 3),
    windDirectionDegrees: 270 + index,
    feelsLikeTemperature: 54 + index * 0.5,
  })),
  sunrise: '2026-10-30T14:31:00Z',
  sunset: '2026-10-31T01:12:00Z',
  polar: null,
  ...overrides,
});

const renderTab = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveLocationProvider>
        <TrendsTab />
      </ActiveLocationProvider>
    </QueryClientProvider>,
  );
};

describe('TrendsTab', () => {
  beforeEach(() => {
    getTrends.mockReset();
    getTrends.mockResolvedValue(trends());
  });

  it('renders both charts from the API payload', async () => {
    renderTab();

    expect(await screen.findByRole('img', { name: /temperature chart/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /humidity chart/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Temperature (24 h)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Humidity (24 h)' })).toBeInTheDocument();
  });

  it('labels synthetic data so it is never mistaken for observations', async () => {
    renderTab();

    expect(await screen.findByText('Sample 24-hour data')).toBeInTheDocument();
  });

  it('hides the badge when the backend stops generating data', async () => {
    getTrends.mockResolvedValue(trends({ mock: false }));

    renderTab();

    await screen.findByRole('img', { name: /temperature chart/i });
    expect(screen.queryByText(/sample 24-hour data/i)).not.toBeInTheDocument();
  });

  it('explains the feels-like value with the rule that applied', async () => {
    getTrends.mockResolvedValue(
      trends({
        current: {
          temperature: 41,
          humidity: 60,
          windSpeedMph: 12,
          windDirectionDegrees: 285,
          feelsLikeTemperature: 34.2,
          description: 'Partly cloudy',
        },
      }),
    );

    renderTab();

    expect(await screen.findByText('34.2°F')).toBeInTheDocument();
    expect(screen.getByText('includes wind chill')).toBeInTheDocument();
    expect(screen.getByText('Air temperature 41°F')).toBeInTheDocument();
  });

  it('shows the humidity min, max and average derived from the payload', async () => {
    renderTab();

    expect(
      await screen.findByText(/min 70% · max 74% · average 72%/i),
    ).toBeInTheDocument();
  });

  it('renders the wind and sun widgets', async () => {
    renderTab();

    expect(await screen.findByLabelText('Wind 9.4 mph from the west-northwest')).toBeInTheDocument();
    expect(screen.getByText('7:31 AM')).toBeInTheDocument();
    expect(screen.getByText('6:12 PM')).toBeInTheDocument();
  });

  it('shows skeletons while the series loads', () => {
    getTrends.mockImplementation(() => new Promise<WeatherTrends>(() => {}));

    const { container } = renderTab();

    const tab = container.querySelector('#tabpanel-trends');
    expect(tab).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText(/loading 24-hour trends/i)).toBeInTheDocument();
  });

  it('shows a friendly error with Retry', async () => {
    getTrends.mockRejectedValueOnce(new Error('boom'));

    renderTab();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn't load the trends/i);

    getTrends.mockResolvedValue(trends());
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByRole('img', { name: /temperature chart/i })).toBeInTheDocument());
  });
});
