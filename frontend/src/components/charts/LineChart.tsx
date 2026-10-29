import { formatHour } from '../../utils/format';

export interface ChartPoint {
  /** ISO timestamp of the hour. */
  time: string;
  value: number;
}

interface LineChartProps {
  /** Also used as the table caption and the image label. */
  title: string;
  unit: string;
  points: ChartPoint[];
  utcOffsetMinutes: number;
  /** Written summary for assistive tech; the drawing itself is hidden from it. */
  summary: string;
  /** CSS custom property for the stroke colour so both themes stay token-driven. */
  colorVariable?: string;
  decimals?: number;
}

const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 190;
const PADDING = { top: 14, right: 12, bottom: 30, left: 40 };
const Y_TICKS = 4;
const X_TICK_EVERY = 6;
const DOMAIN_PADDING_RATIO = 0.1;

const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

export const LineChart: React.FC<LineChartProps> = ({
  title,
  unit,
  points,
  utcOffsetMinutes,
  summary,
  colorVariable = 'var(--color-accent)',
  decimals = 0,
}) => {
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || 1;
  const domainMin = rawMin - spread * DOMAIN_PADDING_RATIO;
  const domainMax = rawMax + spread * DOMAIN_PADDING_RATIO;
  const domainSpan = domainMax - domainMin;

  const x = (index: number) => {
    if (points.length <= 1) {
      return PADDING.left + plotWidth / 2;
    }
    return PADDING.left + (index / (points.length - 1)) * plotWidth;
  };
  const y = (value: number) => PADDING.top + plotHeight - ((value - domainMin) / domainSpan) * plotHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const area = `${x(0)},${PADDING.top + plotHeight} ${line} ${x(points.length - 1)},${PADDING.top + plotHeight}`;

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, index) => {
    const value = domainMin + (domainSpan * index) / Y_TICKS;
    return { value, y: y(value) };
  });

  return (
    <figure className="line-chart">
      <div className="line-chart__canvas" role="img" aria-label={`${title} chart. ${summary}`}>
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="line-chart__svg"
          aria-hidden="true"
          focusable="false"
        >
          {yTicks.map((tick) => (
            <g key={`grid-${tick.y}`}>
              <line
                className="line-chart__grid"
                x1={PADDING.left}
                y1={tick.y}
                x2={PADDING.left + plotWidth}
                y2={tick.y}
              />
              <text className="line-chart__tick" x={PADDING.left - 6} y={tick.y + 4} textAnchor="end">
                {round(tick.value, decimals)}
              </text>
            </g>
          ))}

          <polygon className="line-chart__area" points={area} style={{ fill: colorVariable }} />
          <polyline className="line-chart__line" points={line} style={{ stroke: colorVariable }} />

          {points.map((point, index) => (
            <circle
              key={`dot-${point.time}`}
              className="line-chart__dot"
              cx={x(index)}
              cy={y(point.value)}
              r={2.5}
              style={{ fill: colorVariable }}
            />
          ))}

          {points.map((point, index) =>
            index % X_TICK_EVERY === 0 || index === points.length - 1 ? (
              <text
                key={`hour-${point.time}`}
                className="line-chart__tick"
                x={x(index)}
                y={VIEW_HEIGHT - 8}
                textAnchor="middle"
              >
                {formatHour(point.time, utcOffsetMinutes)}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      {/* The values are always available as text: a chart alone is not accessible. */}
      <table className="sr-only">
        <caption>
          {title} for the last {points.length} hours ({unit})
        </caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">
              {title} ({unit})
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.time}>
              <th scope="row">{formatHour(point.time, utcOffsetMinutes)}</th>
              <td>{round(point.value, decimals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
