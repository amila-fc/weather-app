import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonTab } from './ComparisonTab';
import { useComparisonLocations } from '../hooks/useComparisonLocations';
import { weatherApi } from '../api/weatherClient';
import type { WeatherData } from '../api/weatherClient';

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

const ComparisonTabHarness: React.FC = () => {
  const comparison = useComparisonLocations();
  return <ComparisonTab comparison={comparison} />;
};

const renderTab = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComparisonTabHarness />
    </QueryClientProvider>,
  );
};

const addLocation = async (lat: string, lng: string) => {
  const latitude = screen.getByLabelText(/latitude/i);
  const longitude = screen.getByLabelText(/longitude/i);
  await userEvent.clear(latitude);
  await userEvent.type(latitude, lat);
  await userEvent.clear(longitude);
  await userEvent.type(longitude, lng);
  await userEvent.click(screen.getByRole('button', { name: 'Add to comparison' }));
};

describe('ComparisonTab', () => {
  beforeEach(() => {
    getWeather.mockReset();
    getWeather.mockResolvedValue(WEATHER);
    window.localStorage.clear();
  });

  it('adds locations to the comparison table and removes them again', async () => {
    renderTab();
    expect(screen.getByText('0/5 locations')).toBeInTheDocument();
    expect(screen.getByText(/add up to 5 locations/i)).toBeInTheDocument();

    await addLocation('47', '8');

    expect(screen.getByText('1/5 locations')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '47.0000, 8.0000' })).toBeInTheDocument();
    expect(await screen.findByText('55°F')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove 47.0000, 8.0000/i }));

    expect(screen.getByText('0/5 locations')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '47.0000, 8.0000' })).not.toBeInTheDocument();
  });

  it('rejects a duplicate location with a message', async () => {
    renderTab();

    await addLocation('47', '8');
    await addLocation('47.00001', '8.00001');

    expect(screen.getByText('1/5 locations')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('already in the comparison');
  });

  it('rejects a sixth location with the maximum message', async () => {
    renderTab();

    for (let index = 0; index < 5; index += 1) {
      await addLocation(String(index), String(index));
    }
    await addLocation('9', '9');

    expect(screen.getByText('5/5 locations')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('maximum of 5 locations');
  });

  it('rejects out-of-range coordinates without issuing a request', async () => {
    renderTab();

    await addLocation('100', '8');

    expect(screen.getByText('0/5 locations')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('latitude between -90 and 90');
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('saves, loads and deletes a favorite combination', async () => {
    renderTab();
    await addLocation('47', '8');
    await addLocation('40.7128', '-74.006');

    await userEvent.type(screen.getByLabelText('Name'), 'Home & Work');
    await userEvent.click(screen.getByRole('button', { name: 'Save combination' }));

    const favoritesSection = screen
      .getByRole('heading', { name: 'Saved combinations' })
      .closest('section') as HTMLElement;

    expect(within(favoritesSection).getAllByRole('listitem')).toHaveLength(1);
    expect(within(favoritesSection).getByText('Home & Work')).toBeInTheDocument();
    expect(within(favoritesSection).getByText(/2 locations/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove 47.0000, 8.0000/i }));
    await userEvent.click(screen.getByRole('button', { name: /remove 40.7128, -74.0060/i }));
    expect(screen.getByText('0/5 locations')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Load' }));

    expect(screen.getByText('2/5 locations')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '47.0000, 8.0000' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('Home & Work')).not.toBeInTheDocument();
    expect(screen.getByText(/no saved combinations yet/i)).toBeInTheDocument();
  });

  it('refuses to save a combination without a name', async () => {
    renderTab();
    await addLocation('47', '8');

    await userEvent.click(screen.getByRole('button', { name: 'Save combination' }));

    expect(screen.getByRole('status')).toHaveTextContent('Enter a name for the combination');
    expect(screen.queryByRole('button', { name: 'Load' })).not.toBeInTheDocument();
  });
});
