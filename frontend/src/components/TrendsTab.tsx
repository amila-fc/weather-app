import { useTrendsQuery } from '../api/trendsQuery';
import type { TrendsCurrent } from '../api/trendsClient';
import { useActiveLocation } from '../state/ActiveLocationContext';
import { formatHumidity } from '../utils/format';
import { LineChart } from './charts/LineChart';
import type { ChartPoint } from './charts/LineChart';
import { SkeletonBlock } from './Skeleton';
import { SunTimes } from './SunTimes';
import { WindIndicator } from './WindIndicator';

// Mirrors FeelsLikeCalculator's rules so the number can be explained next to it.
const WIND_CHILL_MAX_TEMPERATURE_F = 50;
const WIND_CHILL_MIN_WIND_MPH = 3;
const HEAT_INDEX_MIN_TEMPERATURE_F = 80;
const HEAT_INDEX_MIN_HUMIDITY = 40;
const SKELETON_ROWS = ['Feels like', 'Wind', 'Sun', 'Temperature', 'Humidity'];

const round1 = (value: number) => Number(value.toFixed(1));

const describeFeelsLike = (current: TrendsCurrent): string => {  if (current.temperature <= WIND_CHILL_MAX_TEMPERATURE_F && current.windSpeedMph >= WIND_CHILL_MIN_WIND_MPH) {
    return 'includes wind chill';
  }
  if (current.temperature >= HEAT_INDEX_MIN_TEMPERATURE_F && current.humidity >= HEAT_INDEX_MIN_HUMIDITY) {
    return 'includes humidity (heat index)';
  }
  return 'close to the air temperature';
};

export const TrendsTab: React.FC = () => {
  const { location } = useActiveLocation();
  const { data, isLoading, error, refetch } = useTrendsQuery(location);

  if (isLoading) {
    return (
      <div id="tabpanel-trends" role="tabpanel" aria-labelledby="tab-trends" className="trends-tab" aria-busy="true">
        <span className="sr-only">Loading 24-hour trends for {location.lat}, {location.lng}</span>
        <h2>24-hour trends</h2>
        {SKELETON_ROWS.map((row) => (
          <div className="trends-panel" key={row}>
            <SkeletonBlock width="30%" height="1rem" />
            <SkeletonBlock width="100%" height="120px" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div id="tabpanel-trends" role="tabpanel" aria-labelledby="tab-trends" className="trends-tab">
        <div className="weather-error" role="alert">
          <p>We couldn't load the trends for this location. Check your connection and try again.</p>
          <button type="button" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const temperaturePoints: ChartPoint[] = data.hourly.map((point) => ({
    time: point.time,
    value: point.temperature,
  }));
  const humidityPoints: ChartPoint[] = data.hourly.map((point) => ({
    time: point.time,
    value: point.humidity,
  }));

  const humidityValues = humidityPoints.map((point) => point.value);
  const humidityMin = Math.min(...humidityValues);
  const humidityMax = Math.max(...humidityValues);
  const humidityAverage =
    humidityValues.reduce((total, value) => total + value, 0) / humidityValues.length;

  const temperatureSummary = `Lowest ${round1(Math.min(...temperaturePoints.map((p) => p.value)))}°F, highest ${round1(
    Math.max(...temperaturePoints.map((p) => p.value)),
  )}°F over ${data.hourly.length} hours.`;
  const humiditySummary = `Lowest ${formatHumidity(humidityMin)}, highest ${formatHumidity(
    humidityMax,
  )}, average ${formatHumidity(humidityAverage)}.`;

  return (
    <div id="tabpanel-trends" role="tabpanel" aria-labelledby="tab-trends" className="trends-tab">
      <section className="trends-summary">
        <div className="trends-summary__header">
          <h2>24-hour trends</h2>
          {data.mock && <p className="trends-badge">Sample {data.hours}-hour data</p>}
        </div>

        <div className="trends-cards">
          <section className="trends-card" aria-label="Feels like">
            <h3 className="trends-card__title">Feels like</h3>
            <p className="trends-card__value">{round1(data.current.feelsLikeTemperature)}°F</p>
            <p className="trends-card__note">{describeFeelsLike(data.current)}</p>
            <p className="trends-card__meta">Air temperature {round1(data.current.temperature)}°F</p>
          </section>

          <WindIndicator
            speedMph={data.current.windSpeedMph}
            directionDegrees={data.current.windDirectionDegrees}
          />

          <SunTimes
            sunrise={data.sunrise}
            sunset={data.sunset}
            utcOffsetMinutes={data.utcOffsetMinutes}
            polar={data.polar}
          />
        </div>
      </section>

      <section className="trends-panel" aria-labelledby="trends-temperature-heading">
        <h3 id="trends-temperature-heading">Temperature ({data.hours} h)</h3>
        <LineChart
          title="Temperature"
          unit="°F"
          points={temperaturePoints}
          utcOffsetMinutes={data.utcOffsetMinutes}
          summary={temperatureSummary}
          colorVariable="var(--color-band-warm)"
          decimals={1}
        />
      </section>

      <section className="trends-panel" aria-labelledby="trends-humidity-heading">
        <h3 id="trends-humidity-heading">Humidity ({data.hours} h)</h3>
        <p className="trends-panel__summary">
          Min {formatHumidity(humidityMin)} · Max {formatHumidity(humidityMax)} · Average{' '}
          {formatHumidity(humidityAverage)}
        </p>
        <LineChart
          title="Humidity"
          unit="%"
          points={humidityPoints}
          utcOffsetMinutes={data.utcOffsetMinutes}
          summary={humiditySummary}
          colorVariable="var(--color-band-cold)"
        />
      </section>
    </div>
  );
};
