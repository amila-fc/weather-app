import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Coordinates } from '../api/weatherClient';
import { useWeatherQuery } from '../api/weatherQuery';
import { MAX_COMPARISON_LOCATIONS } from '../hooks/useComparisonLocations';
import { roundCoordinate } from '../utils/coordinates';
import { getTemperatureBand } from '../utils/temperature';
import { WeatherPopup } from './WeatherPopup';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface WeatherMapProps {
  coordinates: Coordinates;
  points: Coordinates[];
  onSelect: (coordinates: Coordinates) => void;
  /** Hands the selected map points over to the comparison tab. */
  onCompare: () => void;
}

const MapEvents: React.FC<{ onSelect: (coordinates: Coordinates) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect({
        lat: roundCoordinate(event.latlng.lat),
        lng: roundCoordinate(event.latlng.lng),
      });
    },
  });
  return null;
};

const MapController: React.FC<{ coordinates: Coordinates }> = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      map.flyTo([coordinates.lat, coordinates.lng], map.getZoom(), { duration: 0 });
      return;
    }
    map.flyTo([coordinates.lat, coordinates.lng]);
  }, [map, coordinates.lat, coordinates.lng]);

  return null;
};

const WeatherMarker: React.FC<{
  point: Coordinates;
  compareCount: number;
  pinnedCount: number;
  onCompare: () => void;
}> = ({ point, compareCount, pinnedCount, onCompare }) => {
  const { data } = useWeatherQuery(point);

  const modifier = data
    ? `temperature-marker--${getTemperatureBand(data.temperature).band}`
    : 'temperature-marker--pending';
  const label = data ? `${Math.round(data.temperature)}°F` : '';

  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'temperature-marker-icon',
        html: `<span class="temperature-marker ${modifier}">${label}</span>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      }),
    [modifier, label],
  );

  return (
    <Marker position={[point.lat, point.lng]} icon={icon}>
      <Popup>
        <WeatherPopup
          coordinates={point}
          compareCount={compareCount}
          pinnedCount={pinnedCount}
          onCompare={onCompare}
        />
      </Popup>
    </Marker>
  );
};

export const WeatherMap: React.FC<WeatherMapProps> = ({ coordinates, points, onSelect, onCompare }) => {
  // Every pin stays on the map; the comparison only ever takes the most recent ones.
  const compareCount = Math.min(points.length, MAX_COMPARISON_LOCATIONS);

  return (
    <section className="weather-map-section">
      <h2>Explore the map</h2>
      <p className="weather-map-hint" id="weather-map-hint">
        Click the map to load that location's weather, or enter coordinates in the form to use the
        keyboard. Comparing uses the {MAX_COMPARISON_LOCATIONS} most recent pins.
      </p>
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={9}
        scrollWheelZoom
        className="weather-map"
        aria-describedby="weather-map-hint"
        aria-label="Weather map"
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <MapEvents onSelect={onSelect} />
        <MapController coordinates={coordinates} />
        {points.map((point) => (
          <WeatherMarker
            key={`${point.lat},${point.lng}`}
            point={point}
            compareCount={compareCount}
            pinnedCount={points.length}
            onCompare={onCompare}
          />
        ))}
      </MapContainer>
    </section>
  );
};
