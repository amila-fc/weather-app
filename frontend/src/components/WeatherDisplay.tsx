import { useQuery } from '@tanstack/react-query';
import { weatherApi, Coordinates } from '../api/weatherClient';
import { formatHumidity } from '../utils/format';
import { SkeletonBlock } from './Skeleton';

interface WeatherDisplayProps {
  coordinates: Coordinates;
}

const SKELETON_ROWS = ['Temperature', 'Feels Like', 'Humidity', 'Description'];

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ coordinates }) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['weather', coordinates.lat, coordinates.lng],
    queryFn: () => weatherApi.getWeather(coordinates),
    enabled: !!coordinates.lat && !!coordinates.lng,
  });

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

  return (
    <div className={`weather-display ${isFrosty ? 'frost-warning' : ''}`}>
      <h2>Current Weather</h2>
      <p className="sr-only" role="status" aria-live="polite">
        Current temperature {Math.round(data.temperature)} degrees Fahrenheit, {data.description}
      </p>
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
};