import { Coordinates } from '../api/weatherClient';
import { useWeatherQuery } from '../api/weatherQuery';
import { MAX_COMPARISON_LOCATIONS } from '../hooks/useComparisonLocations';
import { formatHumidity } from '../utils/format';
import { SkeletonBlock, SkeletonText } from './Skeleton';

interface WeatherPopupProps {
  coordinates: Coordinates;
  /** How many locations will be compared (already capped at the comparison limit). */
  compareCount?: number;
  /** Total pins on the map, so the popup can explain that only the most recent ones are compared. */
  pinnedCount?: number;
  onCompare?: () => void;
}

export const WeatherPopup: React.FC<WeatherPopupProps> = ({
  coordinates,
  compareCount,
  pinnedCount,
  onCompare,
}) => {
  const { data, isLoading, error, refetch } = useWeatherQuery(coordinates);
  const selectedCount = compareCount ?? 0;
  const totalPinned = pinnedCount ?? selectedCount;
  const truncated = totalPinned > selectedCount;
  const canCompare = selectedCount >= 2 && selectedCount <= MAX_COMPARISON_LOCATIONS;

  if (isLoading) {
    return (
      <div className="weather-popup weather-popup--loading" aria-busy="true">
        <span className="sr-only">Loading weather for this point</span>
        <SkeletonBlock width="72px" height="1.6rem" />
        <SkeletonText lines={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-popup weather-popup--error" role="alert">
        <p>We couldn't load the weather for this point.</p>
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
          <dd>{formatHumidity(data.humidity)}</dd>
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

      <button
        type="button"
        className="weather-popup__compare"
        disabled={!canCompare}
        onClick={onCompare}
      >
        Compare these {selectedCount} locations
      </button>
      {!canCompare && (
        <p className="weather-popup__hint">
          Select at least 2 map locations to compare them.
        </p>
      )}
      {canCompare && truncated && (
        <p className="weather-popup__hint">
          Comparing the {selectedCount} most recent of {totalPinned} pins.
        </p>
      )}
    </div>
  );
};
