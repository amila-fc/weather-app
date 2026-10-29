import { cardinalDirection } from '../utils/format';

interface WindIndicatorProps {
  speedMph: number;
  /** Bearing the wind blows from, clockwise from north. */
  directionDegrees: number;
}

/** Spoken compass names, so the label reads "from the west-northwest" rather than "from the WNW". */
const SPOKEN_DIRECTIONS: Record<string, string> = {
  N: 'north',
  NNE: 'north-northeast',
  NE: 'northeast',
  ENE: 'east-northeast',
  E: 'east',
  ESE: 'east-southeast',
  SE: 'southeast',
  SSE: 'south-southeast',
  S: 'south',
  SSW: 'south-southwest',
  SW: 'southwest',
  WSW: 'west-southwest',
  W: 'west',
  WNW: 'west-northwest',
  NW: 'northwest',
  NNW: 'north-northwest',
};

const CALM_THRESHOLD_MPH = 0;

const normalizeBearing = (degrees: number) => ((degrees % 360) + 360) % 360;

export const WindIndicator: React.FC<WindIndicatorProps> = ({ speedMph, directionDegrees }) => {
  const isCalm = speedMph <= CALM_THRESHOLD_MPH;
  const bearing = normalizeBearing(directionDegrees);
  const cardinal = cardinalDirection(bearing);
  const spoken = SPOKEN_DIRECTIONS[cardinal] ?? cardinal.toLowerCase();
  const speed = Number(speedMph.toFixed(1));

  return (
    <section
      className="wind-indicator"
      aria-label={isCalm ? 'Wind: calm' : `Wind ${speed} mph from the ${spoken}`}
    >
      <h3 className="wind-indicator__title">Wind</h3>
      {isCalm ? (
        <p className="wind-indicator__calm">Calm</p>
      ) : (
        <>
          <div className="wind-indicator__rose" aria-hidden="true">
            <span className="wind-indicator__axis wind-indicator__axis--vertical" />
            <span className="wind-indicator__axis wind-indicator__axis--horizontal" />
            <span
              className="wind-indicator__arrow"
              data-bearing={bearing}
              style={{ transform: `rotate(${bearing}deg)` }}
            />
          </div>
          <p className="wind-indicator__speed">{speed} mph</p>
          <p className="wind-indicator__cardinal">from {cardinal}</p>
        </>
      )}
    </section>
  );
};
