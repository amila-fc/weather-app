import { Coordinates } from '../api/weatherClient';
import { useWeatherQuery } from '../api/weatherQuery';

interface WeatherPopupProps {
  coordinates: Coordinates;
}

export const WeatherPopup: React.FC<WeatherPopupProps> = ({ coordinates }) => {
  const { data, isLoading, error, refetch } = useWeatherQuery(coordinates);

  if (isLoading) {
    return (
      <div className="weather-popup weather-popup--loading">
        <div className="spinner"></div>
        <p>Loading weather...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-popup weather-popup--error">
        <p>Could not load weather for this point.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="weather-popup">
      <div className="weather-popup__temperature">{data.temperature}°F</div>
      <dl className="weather-popup__items">
        <div className="weather-popup__item">
          <dt>Feels like</dt>
          <dd>{data.apparentTemperature}°F</dd>
        </div>
        <div className="weather-popup__item">
          <dt>Humidity</dt>
          <dd>{data.humidity}%</dd>
        </div>
        <div className="weather-popup__item">
          <dt>Conditions</dt>
          <dd>{data.description}</dd>
        </div>
        {data.source && (
          <div className="weather-popup__item">
            <dt>Source</dt>
            <dd>{data.source}</dd>
          </div>
        )}
      </dl>
      {data.frost_advisory && (
        <p className="weather-popup__advisory">{data.frost_advisory}</p>
      )}
      <button type="button" className="weather-popup__refresh" onClick={() => refetch()}>
        Refresh
      </button>
    </div>
  );
};
