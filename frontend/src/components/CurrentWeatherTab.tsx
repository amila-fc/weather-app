import { Suspense, lazy, useCallback, useState } from 'react';
import type { Coordinates } from '../api/weatherClient';
import { MAX_COMPARISON_LOCATIONS } from '../hooks/useComparisonLocations';
import { useActiveLocation } from '../state/ActiveLocationContext';
import { LocationPicker } from './LocationPicker';
import { SkeletonBlock } from './Skeleton';
import { WeatherDisplay } from './WeatherDisplay';

// Leaflet and its CSS live in their own chunk, so the first paint never waits for the map bundle.
const WeatherMap = lazy(() =>
  import('./WeatherMap').then((module) => ({ default: module.WeatherMap })),
);

interface CurrentWeatherTabProps {
  /** Receives the most recent map points (at most the comparison limit) and navigates to that tab. */
  onCompare: (locations: Coordinates[]) => void;
}

const MapSkeleton: React.FC = () => (
  <section className="weather-map-section" aria-busy="true">
    <span className="sr-only">Loading the weather map…</span>
    <SkeletonBlock width="100%" height="320px" />
  </section>
);

export const CurrentWeatherTab: React.FC<CurrentWeatherTabProps> = ({ onCompare }) => {
  const { location: coordinates, setLocation: setCoordinates } = useActiveLocation();
  const [points, setPoints] = useState<Coordinates[]>([coordinates]);

  // Pins are unlimited: every point the user picks stays on the map. Only the comparison is capped, and it
  // takes the most recent picks, so a long exploration session still compares the 5 latest locations.
  const selectCoordinates = useCallback(
    (next: Coordinates) => {
      setCoordinates(next);
      setPoints((current) =>
        current.some((point) => point.lat === next.lat && point.lng === next.lng)
          ? current
          : [...current, next],
      );
    },
    [setCoordinates],
  );

  const compareRecentLocations = useCallback(
    () => onCompare(points.slice(-MAX_COMPARISON_LOCATIONS)),
    [onCompare, points],
  );

  return (
    <div
      id="tabpanel-current"
      role="tabpanel"
      aria-labelledby="tab-current"
      className="current-tab"
    >
      <Suspense fallback={<MapSkeleton />}>
        <WeatherMap
          coordinates={coordinates}
          points={points}
          onSelect={selectCoordinates}
          onCompare={compareRecentLocations}
        />
      </Suspense>

      <div className="coordinates-form">
        <h2>Enter Location</h2>
        <LocationPicker value={coordinates} onSelect={selectCoordinates} submitLabel="Get Weather" />
      </div>

      <WeatherDisplay latitude={coordinates.lat} longitude={coordinates.lng} />
    </div>
  );
};
