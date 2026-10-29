import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherMap } from './WeatherMap';
import { weatherApi } from '../api/weatherClient';
import type { Coordinates, WeatherData } from '../api/weatherClient';

const leaflet = vi.hoisted(() => ({
  click: undefined as undefined | ((event: { latlng: { lat: number; lng: number } }) => void),
  flyTo: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: ({ url, attribution }: { url: string; attribution: string }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution} />
  ),
  Marker: ({
    position,
    icon,
    children,
  }: {
    position: [number, number];
    icon: { options?: { html?: string } };
    children?: React.ReactNode;
  }) => (
    <div data-testid="marker" data-position={position.join(',')} data-icon-html={icon.options?.html ?? ''}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMapEvents: (handlers: { click: (event: { latlng: { lat: number; lng: number } }) => void }) => {
    leaflet.click = handlers.click;
    return null;
  },
  useMap: () => ({ flyTo: leaflet.flyTo }),
}));

vi.mock('../api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const getWeather = vi.mocked(weatherApi.getWeather);

const POINT: Coordinates = { lat: 37.7749, lng: -122.4194 };

const weather = (temperature: number): WeatherData => ({
  temperature,
  humidity: 55,
  description: 'Clear',
  apparentTemperature: temperature - 2,
  summary: 'Clear skies',
});

const renderMap = (overrides?: { coordinates?: Coordinates; points?: Coordinates[] }) => {
  const onSelect = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <WeatherMap
        coordinates={overrides?.coordinates ?? POINT}
        points={overrides?.points ?? [POINT]}
        onSelect={onSelect}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onSelect };
};

describe('WeatherMap', () => {
  beforeEach(() => {
    getWeather.mockReset();
    getWeather.mockResolvedValue(weather(55));
    leaflet.flyTo.mockClear();
    leaflet.click = undefined;
  });

  it('renders OpenStreetMap tiles with the required attribution', () => {
    renderMap();

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer.getAttribute('data-url')).toContain('openstreetmap.org');
    expect(tileLayer.getAttribute('data-attribution')).toContain('OpenStreetMap');
  });

  it('reports a map click as coordinates rounded to four decimals', () => {
    const { onSelect } = renderMap();

    act(() => {
      leaflet.click?.({ latlng: { lat: 37.77491234, lng: -122.41945678 } });
    });

    expect(onSelect).toHaveBeenCalledWith({ lat: 37.7749, lng: -122.4195 });
  });

  it('shows a pending marker while the temperature is loading', () => {
    getWeather.mockReturnValue(new Promise<WeatherData>(() => {}));

    renderMap();

    expect(screen.getByTestId('marker').getAttribute('data-icon-html')).toContain('temperature-marker--pending');
  });

  it('colours the marker from the temperature band of the fetched weather', async () => {
    getWeather.mockResolvedValue(weather(20));

    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId('marker').getAttribute('data-icon-html')).toContain(
        'temperature-marker--freezing',
      ),
    );
  });

  it('keeps each clicked point in its own band', async () => {
    const otherPoint: Coordinates = { lat: 40.7128, lng: -74.006 };
    getWeather.mockImplementation(async ({ lat }) => weather(lat === POINT.lat ? 20 : 90));

    renderMap({ points: [POINT, otherPoint] });

    await waitFor(() => {
      const markers = screen.getAllByTestId('marker');
      expect(markers[0].getAttribute('data-icon-html')).toContain('temperature-marker--freezing');
      expect(markers[1].getAttribute('data-icon-html')).toContain('temperature-marker--hot');
    });
  });

  it('recentres the map when the coordinates change', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onSelect = vi.fn();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <WeatherMap coordinates={{ lat: 10, lng: 20 }} points={[]} onSelect={onSelect} />
      </QueryClientProvider>,
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <WeatherMap coordinates={{ lat: 30, lng: 40 }} points={[]} onSelect={onSelect} />
      </QueryClientProvider>,
    );

    expect(leaflet.flyTo).toHaveBeenCalledWith([30, 40]);
  });
});
