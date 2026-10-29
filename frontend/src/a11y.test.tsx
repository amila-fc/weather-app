import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { WeatherData } from './api/weatherClient';
import { weatherApi } from './api/weatherClient';
import { ComparisonTab } from './components/ComparisonTab';
import { NotificationPanel } from './components/NotificationPanel';
import { toComparisonLocation } from './hooks/useComparisonLocations';
import type { ComparisonLocationsState } from './hooks/useComparisonLocations';
import { renderWithProviders } from './test/renderWithProviders';
import type { WeatherAlert } from './utils/alerts';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMapEvents: () => null,
  useMap: () => ({ flyTo: vi.fn(), getZoom: () => 9 }),
}));

vi.mock('./api/weatherClient', () => ({
  weatherApi: { getWeather: vi.fn(), getStatus: vi.fn() },
}));

const WEATHER: WeatherData = {
  temperature: 30,
  humidity: 62,
  description: 'Light snow',
  apparentTemperature: 24,
  summary: 'Snow showers',
  source: 'averaged',
  frost_warning: true,
  frost_severity: 'light',
  frost_advisory: 'Cover sensitive plants tonight.',
};

const ALERTS: WeatherAlert[] = [
  {
    id: 'frost:37.7749,-122.4194:light',
    type: 'frost',
    title: 'Frost warning',
    body: 'light frost: Cover sensitive plants tonight.',
    createdAt: new Date().toISOString(),
    coordinates: { lat: 37.7749, lng: -122.4194 },
  },
];

const comparisonState = (): ComparisonLocationsState => {
  const locations = [
    toComparisonLocation({ lat: 37.7749, lng: -122.4194 }),
    toComparisonLocation({ lat: 40.7128, lng: -74.006 }),
  ];
  return {
    locations,
    add: () => 'added',
    remove: vi.fn(),
    replaceAll: vi.fn(),
    clear: vi.fn(),
    isFull: false,
  };
};

const THEMES = ['light', 'dark'] as const;

describe('accessibility', () => {
  beforeEach(() => {
    vi.mocked(weatherApi.getWeather).mockResolvedValue(WEATHER);
    vi.mocked(weatherApi.getStatus).mockResolvedValue('Server is running.');
    window.location.hash = '';
    delete document.documentElement.dataset.theme;
  });

  it.each(THEMES)('renders the current-weather view without violations (%s theme)', async (theme) => {
    document.documentElement.dataset.theme = theme;

    const { container } = renderWithProviders(<App />);
    await screen.findAllByText('Light snow');

    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(THEMES)('renders the comparison view without violations (%s theme)', async (theme) => {
    document.documentElement.dataset.theme = theme;

    const { container } = renderWithProviders(<ComparisonTab comparison={comparisonState()} />);
    await screen.findByRole('table');

    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(THEMES)('renders the notification panel without violations (%s theme)', async (theme) => {
    document.documentElement.dataset.theme = theme;
    const onSelectAlert = vi.fn();

    const { container } = render(
      <NotificationPanel alerts={ALERTS} onMarkAllRead={vi.fn()} onSelectAlert={onSelectAlert} />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('exposes landmarks, a skip link and a single h1', async () => {
    renderWithProviders(<App />);
    await screen.findAllByText('Light snow');

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('navigation', { name: 'Weather views' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('moves focus to the skip link on the first Tab press', async () => {
    renderWithProviders(<App />);

    await userEvent.tab();

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
  });
});
