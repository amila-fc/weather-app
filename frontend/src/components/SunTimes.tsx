import { formatClockInOffset, formatMinutesAsHours, minutesBetween } from '../utils/format';

interface SunTimesProps {
  sunrise: string | null;
  sunset: string | null;
  /** Offset the location's clock is displayed with; never the browser zone. */
  utcOffsetMinutes: number;
  /** 'day' or 'night' inside the polar circles, otherwise null. */
  polar: 'day' | 'night' | null;
}

const MINUTES_PER_POLAR_DAY = 24 * 60;

export const SunTimes: React.FC<SunTimesProps> = ({ sunrise, sunset, utcOffsetMinutes, polar }) => {
  const sunriseLabel = sunrise
    ? formatClockInOffset(sunrise, utcOffsetMinutes)
    : polar === 'night'
      ? 'Polar night — no sunrise'
      : 'No sunrise';
  const sunsetLabel = sunset
    ? formatClockInOffset(sunset, utcOffsetMinutes)
    : polar === 'day'
      ? 'Polar day — no sunset'
      : 'No sunset';

  const dayLength = () => {
    if (polar === 'day') {
      return formatMinutesAsHours(MINUTES_PER_POLAR_DAY);
    }
    if (polar === 'night') {
      return formatMinutesAsHours(0);
    }
    if (sunrise && sunset) {
      return formatMinutesAsHours(minutesBetween(sunrise, sunset));
    }
    return null;
  };
  const dayLengthLabel = dayLength();

  return (
    <section className="sun-times" aria-label="Sunrise and sunset">
      <h3 className="sun-times__title">Sun</h3>
      <dl className="sun-times__list">
        <div className="sun-times__row">
          <dt>Sunrise</dt>
          <dd>{sunriseLabel}</dd>
        </div>
        <div className="sun-times__row">
          <dt>Sunset</dt>
          <dd>{sunsetLabel}</dd>
        </div>
        {dayLengthLabel && (
          <div className="sun-times__row">
            <dt>Day length</dt>
            <dd>{dayLengthLabel}</dd>
          </div>
        )}
      </dl>
    </section>
  );
};
