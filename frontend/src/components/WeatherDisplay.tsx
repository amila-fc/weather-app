import { useQuery } from '@tanstack/react-query';
import { weatherApi, Coordinates } from '../api/weatherClient';

interface WeatherDisplayProps {
  coordinates: Coordinates;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ coordinates }) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['weather', coordinates.lat, coordinates.lng],
    queryFn: () => weatherApi.getWeather(coordinates),
    enabled: !!coordinates.lat && !!coordinates.lng,
  });

  if (isLoading) {
    return (
      <div className="weather-loading">
        <div className="spinner"></div>
        <p>Loading weather data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-error">
        <p>Error loading weather data</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return <div>Enter coordinates to get weather</div>;
  }

  const isFrosty = data.temperature < 32; // Fahrenheit

  return (
    <div className={`weather-display ${isFrosty ? 'frost-warning' : ''}`}>
      <h2>Current Weather</h2>
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
          <span className="value">{data.humidity}%</span>
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