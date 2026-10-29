import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonTable } from './ComparisonTable';
import type { ComparisonLocation } from '../hooks/useComparisonLocations';
import { weatherApi } from '../api/weatherClient';
import type { WeatherData } from '../api/weatherClient';

vi.mock('../api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);

const SAN_FRANCISCO: ComparisonLocation = { id: '37.7749,-122.4194', lat: 37.7749, lng: -122.4194 };
const NEW_YORK: ComparisonLocation = { id: '40.7128,-74.0060', lat: 40.7128, lng: -74.006 };

const weather = (temperature: number, humidity: number, extra?: Partial<WeatherData>): WeatherData => ({
  temperature,
  humidity,
  description: 'Clear',
  apparentTemperature: temperature - 2,
  summary: 'Clear skies',
  ...extra,
});

const renderTable = (locations: ComparisonLocation[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComparisonTable locations={locations} />
    </QueryClientProvider>,
  );
};

describe('ComparisonTable', () => {
  beforeEach(() => {
    getWeather.mockReset();
  });

  it('renders one column per location with the metric rows', async () => {
    getWeather.mockImplementation(async ({ lat }) => (lat === SAN_FRANCISCO.lat ? weather(40, 90) : weather(70, 50)));

    renderTable([SAN_FRANCISCO, NEW_YORK]);

    expect(await screen.findByText('40°F')).toBeInTheDocument();
    expect(screen.getByText('70°F')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('Clear')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByText('37.7749, -122.4194')).toBeInTheDocument();
  });

  it('highlights the warmest and coldest cells with a text alternative', async () => {
    getWeather.mockImplementation(async ({ lat }) => (lat === SAN_FRANCISCO.lat ? weather(40, 89.6) : weather(70, 50)));

    renderTable([SAN_FRANCISCO, NEW_YORK]);
    await screen.findByText('70°F');

    expect(screen.getByText('70°F').closest('td')).toHaveClass('comparison-cell--warmest');
    expect(screen.getByText('40°F').closest('td')).toHaveClass('comparison-cell--coldest');
    expect(screen.getByText('90%').closest('td')).toHaveClass('comparison-cell--highest-humidity');
    expect(screen.getByText('50%').closest('td')).toHaveClass('comparison-cell--lowest-humidity');
    expect(screen.getByText('warmest')).toHaveClass('sr-only');
    expect(screen.getByText('lowest humidity')).toHaveClass('sr-only');
  });

  it('highlights every tied cell', async () => {
    getWeather.mockResolvedValue(weather(55, 60));

    renderTable([SAN_FRANCISCO, NEW_YORK]);
    await waitFor(() => expect(screen.getAllByText('55°F')).toHaveLength(2));

    expect(screen.getAllByText('warmest')).toHaveLength(2);
    expect(screen.getAllByText('55°F')[0].closest('td')).toHaveClass('comparison-cell--warmest');
  });

  it('isolates a failing column behind its own Retry', async () => {
    getWeather.mockImplementation(async ({ lat }) => {
      if (lat === SAN_FRANCISCO.lat) {
        throw new Error('boom');
      }
      return weather(70, 50);
    });

    renderTable([SAN_FRANCISCO, NEW_YORK]);

    expect(await screen.findByText('70°F')).toBeInTheDocument();
    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    expect(retryButtons).toHaveLength(1);

    getWeather.mockResolvedValue(weather(41, 88));
    await userEvent.click(retryButtons[0]);

    expect(await screen.findByText('41°F')).toBeInTheDocument();
    expect(getWeather).toHaveBeenCalledTimes(3);
  });

  it('shows a skeleton while a column is loading', () => {
    getWeather.mockImplementation(({ lat }) =>
      lat === SAN_FRANCISCO.lat ? new Promise<WeatherData>(() => {}) : Promise.resolve(weather(70, 50)),
    );

    renderTable([SAN_FRANCISCO, NEW_YORK]);

    expect(screen.getAllByText('Loading').length).toBeGreaterThan(0);
  });

  it('renders the optional source and frost rows when the backend provides them', async () => {
    getWeather.mockResolvedValue(
      weather(55, 60, { source: 'averaged', frost_warning: true, frost_severity: 'light', frost_advisory: 'Cover plants.' }),
    );

    renderTable([SAN_FRANCISCO, NEW_YORK]);

    expect(await screen.findAllByText('averaged')).toHaveLength(2);
    expect(screen.getAllByText('Cover plants.')).toHaveLength(2);
  });
});
