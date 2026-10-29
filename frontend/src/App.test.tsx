import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { weatherApi } from './api/weatherClient';
import type { WeatherData } from './api/weatherClient';

const leaflet = vi.hoisted(() => ({
  click: undefined as undefined | ((event: { latlng: { lat: number; lng: number } }) => void),
  flyTo: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: ({ attribution }: { attribution: string }) => (
    <div data-testid="tile-layer" data-attribution={attribution} />
  ),
  Marker: ({
    children,
  }: {
    position: [number, number];
    icon: { options?: { html?: string } };
    children?: React.ReactNode;
  }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMapEvents: (handlers: { click: (event: { latlng: { lat: number; lng: number } }) => void }) => {
    leaflet.click = handlers.click;
    return null;
  },
  useMap: () => ({ flyTo: leaflet.flyTo }),
}));

vi.mock('./api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);
const getStatus = vi.mocked(weatherApi.getStatus);

const WEATHER: WeatherData = {
  temperature: 55,
  humidity: 60,
  description: 'Clear',
  apparentTemperature: 53,
  summary: 'Clear skies',
};

const renderApp = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
};

describe('App', () => {
  beforeEach(() => {
    getWeather.mockReset();
    getStatus.mockReset();
    leaflet.click = undefined;
    getStatus.mockResolvedValue('Server is running.');
    getWeather.mockResolvedValue(WEATHER);
  });

  it('turns a map click into one request for the rounded coordinates', async () => {
    renderApp();

    act(() => {
      leaflet.click?.({ latlng: { lat: 40.71281234, lng: -74.00601111 } });
    });

    await waitFor(() => expect(getWeather).toHaveBeenCalledWith({ lat: 40.7128, lng: -74.006 }));

    const callsForClickedPoint = getWeather.mock.calls.filter(
      ([coordinates]) => coordinates.lat === 40.7128 && coordinates.lng === -74.006,
    );
    expect(callsForClickedPoint).toHaveLength(1);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(40.7128);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-74.006);
  });

  it('still loads weather from the manual form', async () => {
    renderApp();

    expect(await screen.findByText('Server Status: Server is running.')).toBeInTheDocument();
    expect(getWeather).toHaveBeenCalledWith({ lat: 37.7749, lng: -122.4194 });
  });
});
