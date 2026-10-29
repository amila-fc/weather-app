import { useState } from 'react';
import type { Coordinates } from '../api/weatherClient';
import { MAX_COMPARISON_LOCATIONS } from '../hooks/useComparisonLocations';
import { useActiveLocation } from '../state/ActiveLocationContext';
import { WeatherDisplay } from './WeatherDisplay';
import { WeatherMap } from './WeatherMap';
import { LocationPicker } from './LocationPicker';

interface CurrentWeatherTabProps {
  /** Receives the selected map points and navigates to the comparison tab. */
  onCompare: (locations: Coordinates[]) => void;
}

export const CurrentWeatherTab: React.FC<CurrentWeatherTabProps> = ({ onCompare }) => {
  const { location: coordinates, setLocation: setCoordinates } = useActiveLocation();
  const [points, setPoints] = useState<Coordinates[]>([coordinates]);

  // Single source of truth for the tab: the form, geolocation and map clicks all funnel through here.
  // Pins stop at the comparison limit so the compare action always has a valid 2..5 set.
  const selectCoordinates = (next: Coordinates) => {
    setCoordinates(next);
    setPoints((current) =>
      current.some((point) => point.lat === next.lat && point.lng === next.lng) ||
      current.length >= MAX_COMPARISON_LOCATIONS
        ? current
        : [...current, next],
    );
  };

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
        onCompare={() => onCompare(points)}
      />

      <div className="coordinates-form">
        <h2>Enter Location</h2>
        <LocationPicker value={coordinates} onSelect={selectCoordinates} submitLabel="Get Weather" />
      </div>

      <WeatherDisplay coordinates={coordinates} />
    </div>
  );
};
