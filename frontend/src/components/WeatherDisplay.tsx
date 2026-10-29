import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { weatherQueryOptions } from '../api/weatherQuery';
import { formatHumidity } from '../utils/format';
import { recordRender } from '../utils/renderCount';
import { weatherIconFor, weatherIconLabel, weatherIconSource } from '../utils/weatherIcons';
import { ProgressiveImage } from './ProgressiveImage';
import { SkeletonBlock } from './Skeleton';

interface WeatherDisplayProps {
  latitude: number;
  longitude: number;
}

const SKELETON_ROWS = ['Temperature', 'Feels Like', 'Humidity', 'Description'];

const CONDITION_ICON_SIZE = 56;

/**
 * Memoised on primitive props: the current-weather tab re-renders on every map click, while the selected
 * location usually stays the same.
 */
export const WeatherDisplay: React.FC<WeatherDisplayProps> = memo(function WeatherDisplay({
  latitude,
  longitude,
}) {
  const coordinates = useMemo(() => ({ lat: latitude, lng: longitude }), [latitude, longitude]);
  recordRender('weather-display');
  const { data, isLoading, error, refetch } = useQuery(weatherQueryOptions(coordinates));

  if (isLoading) {
    return (
      <div className="weather-display weather-display--loading" aria-busy="true">
        <h2>Current Weather</h2>
        <span className="sr-only">
          Loading weather for {coordinates.lat}, {coordinates.lng}
        </span>
        <div className="weather-info">
          {SKELETON_ROWS.map((label) => (
            <div className="weather-item" key={label}>
              <SkeletonBlock width="30%" height="1rem" />
              <SkeletonBlock width="40%" height="1rem" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-error" role="alert">
        <p>We couldn't load the weather for this location. Check your connection and try again.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="weather-empty">Enter coordinates to get weather</p>;
  }

  const isFrosty = data.temperature < 32; // Fahrenheit
  const conditionIcon = weatherIconFor(data.description);

  return (
    <div className={`weather-display ${isFrosty ? 'frost-warning' : ''}`}>
      <h2>Current Weather</h2>
      <p className="sr-only" role="status" aria-live="polite">
        Current temperature {Math.round(data.temperature)} degrees Fahrenheit, {data.description}
      </p>
      <ProgressiveImage
        className="weather-display__icon"
        src={weatherIconSource(conditionIcon)}
        alt={weatherIconLabel(conditionIcon)}
        width={CONDITION_ICON_SIZE}
        height={CONDITION_ICON_SIZE}
      />
      {data.fromLocalCache && (
        <p className="weather-display__cached">Showing saved weather from your last visit.</p>
      )}
      {isFrosty && (
        <div className="frost-alert">
          ❄️ Frost Warning: Temperature below freezing!
        </div>
      )}
      <div className="weather-info">
        <div className="weather-item">
          <span className="label">Temperature:</span>
          <span className="value">{data.temperature}°F</span>
        </div>
        <div className="weather-item">
          <span className="label">Feels Like:</span>
          <span className="value">{data.apparentTemperature}°F</span>
        </div>
        <div className="weather-item">
          <span className="label">Humidity:</span>
          <span className="value">{formatHumidity(data.humidity)}</span>
        </div>
        <div className="weather-item">
          <span className="label">Description:</span>
          <span className="value">{data.description}</span>
        </div>
        {data.summary && (
          <div className="weather-item">
            <span className="label">Summary:</span>
            <span className="value">{data.summary}</span>
          </div>
        )}
      </div>
      <button onClick={() => refetch()} className="refresh-btn">
        Refresh
      </button>
    </div>
  );
});