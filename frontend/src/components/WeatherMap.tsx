import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Coordinates } from '../api/weatherClient';
import { useWeatherQuery } from '../api/weatherQuery';
import { getTemperatureBand, roundCoordinate } from '../utils/temperature';
import { WeatherPopup } from './WeatherPopup';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface WeatherMapProps {
  coordinates: Coordinates;
  points: Coordinates[];
  onSelect: (coordinates: Coordinates) => void;
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
    map.flyTo([coordinates.lat, coordinates.lng]);
  }, [map, coordinates.lat, coordinates.lng]);

  return null;
};

const WeatherMarker: React.FC<{ point: Coordinates }> = ({ point }) => {
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
        <WeatherPopup coordinates={point} />
      </Popup>
    </Marker>
  );
};

export const WeatherMap: React.FC<WeatherMapProps> = ({ coordinates, points, onSelect }) => (
  <section className="weather-map-section">
    <h2>Explore the map</h2>
    <p className="weather-map-hint">Click anywhere on the map to load that location's weather.</p>
    <MapContainer
      center={[coordinates.lat, coordinates.lng]}
      zoom={9}
      scrollWheelZoom
      className="weather-map"
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <MapEvents onSelect={onSelect} />
      <MapController coordinates={coordinates} />
      {points.map((point) => (
        <WeatherMarker key={`${point.lat},${point.lng}`} point={point} />
      ))}
    </MapContainer>
  </section>
);
