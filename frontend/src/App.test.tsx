import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { weatherApi } from './api/weatherClient';
import type { WeatherData } from './api/weatherClient';
import { clearAlerts, pushAlerts } from './hooks/useAlerts';
import { renderWithProviders } from './test/renderWithProviders';

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

const renderApp = () => renderWithProviders(<App />);

describe('App', () => {
  beforeEach(() => {
    getWeather.mockReset();
    getStatus.mockReset();
    leaflet.click = undefined;
    getStatus.mockResolvedValue('Server is running.');
    getWeather.mockResolvedValue(WEATHER);
    window.location.hash = '';
    clearAlerts();
  });

  afterEach(() => {
    window.location.hash = '';
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

  it('switches to the comparison tab and keeps it in the hash', async () => {
    renderApp();

    const compareTab = screen.getByRole('tab', { name: 'Compare' });
    expect(compareTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('tabpanel', { name: 'Compare' })).not.toBeInTheDocument();

    await userEvent.click(compareTab);

    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('0/5 locations')).toBeInTheDocument();
    expect(window.location.hash).toBe('#compare');
  });

  it('opens the comparison tab when the hash already points at it', () => {
    window.location.hash = '#compare';

    renderApp();

    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('0/5 locations')).toBeInTheDocument();
    expect(screen.queryByText('Explore the map')).not.toBeInTheDocument();
  });

  it('hands the pinned map locations to the comparison tab', async () => {
    renderApp();

    act(() => {
      leaflet.click?.({ latlng: { lat: 47.00001, lng: 8.00001 } });
    });
    await waitFor(() => expect(getWeather).toHaveBeenCalledWith({ lat: 47, lng: 8 }));

    const compareButtons = await screen.findAllByRole('button', { name: /compare these 2 locations/i });
    await userEvent.click(compareButtons[0]);

    expect(window.location.hash).toBe('#compare');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('2/5 locations')).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: '47.0000, 8.0000' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '37.7749, -122.4194' })).toBeInTheDocument();
  });

  it('shows the notification bell in the top bar', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toBeInTheDocument();
  });

  it('activates the alert location and returns to the current tab when an alert is selected', async () => {
    window.location.hash = '#compare';
    renderApp();

    act(() => {
      pushAlerts([
        {
          id: 'frost:40.7128,-74.0060:light',
          type: 'frost',
          title: 'Frost warning',
          body: 'light frost: Cover plants.',
          createdAt: new Date().toISOString(),
          coordinates: { lat: 40.7128, lng: -74.006 },
        },
      ]);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    await userEvent.click(screen.getByRole('button', { name: /frost warning/i }));

    expect(window.location.hash).toBe('');
    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(40.7128);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-74.006);
  });

  it('shows the theme toggle next to the bell and switches the document theme', async () => {
    renderApp();

    const toggle = screen.getByRole('button', { name: 'Switch to light theme' });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to system theme' })).toBeInTheDocument();
  });

  it('keeps the header, tabs and the other tab usable when a tab render fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getWeather).mockResolvedValue(
      Object.defineProperty({ ...WEATHER }, 'summary', {
        configurable: true,
        get() {
          throw new Error('render exploded');
        },
      }),
    );

    renderApp();

    expect(await screen.findByText(/couldn't show this view/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Weather App' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Compare' }));
    expect(await screen.findByRole('heading', { name: 'Add a location' })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
