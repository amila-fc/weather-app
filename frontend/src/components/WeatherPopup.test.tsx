import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherPopup } from './WeatherPopup';
import { weatherApi } from '../api/weatherClient';
import type { WeatherData } from '../api/weatherClient';

vi.mock('../api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);

const COORDINATES = { lat: 37.7749, lng: -122.4194 };

const WEATHER: WeatherData = {
  temperature: 55,
  humidity: 60,
  description: 'Clear',
  apparentTemperature: 53,
  summary: 'Clear skies',
};

const renderPopup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WeatherPopup coordinates={COORDINATES} />
    </QueryClientProvider>,
  );
};

describe('WeatherPopup', () => {
  beforeEach(() => {
    getWeather.mockReset();
  });

  it('shows a loading state while the request is in flight', () => {
    getWeather.mockReturnValue(new Promise<WeatherData>(() => {}));

    renderPopup();

    expect(screen.getByText(/loading weather/i)).toBeInTheDocument();
  });

  it('shows temperature, feels-like, humidity and description', async () => {
    getWeather.mockResolvedValue({ ...WEATHER, source: 'averaged' });

    renderPopup();

    expect(await screen.findByText('55°F')).toBeInTheDocument();
    expect(screen.getByText('53°F')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('averaged')).toBeInTheDocument();
  });

  it('shows the frost advisory when the backend provides one', async () => {
    getWeather.mockResolvedValue({
      ...WEATHER,
      temperature: 20,
      frost_warning: true,
      frost_severity: 'light',
      frost_advisory: 'Cover sensitive plants and bring pets indoors.',
    });

    renderPopup();

    expect(await screen.findByText('Cover sensitive plants and bring pets indoors.')).toBeInTheDocument();
  });

  it('shows an error state whose Retry refetches the same coordinates', async () => {
    getWeather.mockRejectedValueOnce(new Error('boom'));

    renderPopup();
    const retry = await screen.findByRole('button', { name: /retry/i });

    getWeather.mockResolvedValueOnce(WEATHER);
    await userEvent.click(retry);

    expect(await screen.findByText('55°F')).toBeInTheDocument();
    expect(getWeather).toHaveBeenCalledTimes(2);
    expect(getWeather).toHaveBeenLastCalledWith(COORDINATES);
  });
});
