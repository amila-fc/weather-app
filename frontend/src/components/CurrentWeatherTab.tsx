import { useState } from 'react';
import type { Coordinates } from '../api/weatherClient';
import { MAX_COMPARISON_LOCATIONS } from '../hooks/useComparisonLocations';
import { useActiveLocation } from '../state/ActiveLocationContext';
import { WeatherDisplay } from './WeatherDisplay';
import { WeatherMap } from './WeatherMap';
import { LocationPicker } from './LocationPicker';

interface CurrentWeatherTabProps {
  /** Receives the most recent map points (at most the comparison limit) and navigates to that tab. */
  onCompare: (locations: Coordinates[]) => void;
}

export const CurrentWeatherTab: React.FC<CurrentWeatherTabProps> = ({ onCompare }) => {
  const { location: coordinates, setLocation: setCoordinates } = useActiveLocation();
  const [points, setPoints] = useState<Coordinates[]>([coordinates]);

  // Pins are unlimited: every point the user picks stays on the map. Only the comparison is capped, and it
  // takes the most recent picks, so a long exploration session still compares the 5 latest locations.
  const selectCoordinates = (next: Coordinates) => {
    setCoordinates(next);
    setPoints((current) =>
      current.some((point) => point.lat === next.lat && point.lng === next.lng)
        ? current
        : [...current, next],
    );
  };

  const compareRecentLocations = () => onCompare(points.slice(-MAX_COMPARISON_LOCATIONS));

  return (
    <div
      id="tabpanel-current"
      role="tabpanel"
      aria-labelledby="tab-current"
      className="current-tab"
    >
      <WeatherMap
        coordinates={coordinates}
        points={points}
        onSelect={selectCoordinates}
        onCompare={compareRecentLocations}
      />

      <div className="coordinates-form">
        <h2>Enter Location</h2>
        <LocationPicker value={coordinates} onSelect={selectCoordinates} submitLabel="Get Weather" />
      </div>

      <WeatherDisplay coordinates={coordinates} />
    </div>
  );
};
