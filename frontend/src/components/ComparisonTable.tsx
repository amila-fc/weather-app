import { useQueries } from '@tanstack/react-query';
import type { WeatherData } from '../api/weatherClient';
import { weatherQueryOptions } from '../api/weatherQuery';
import type { ComparisonLocation } from '../hooks/useComparisonLocations';
import type { ComparisonHighlights } from '../utils/comparison';
import { findHighlights } from '../utils/comparison';
import { formatLocationLabel } from '../utils/coordinates';
import { formatHumidity } from '../utils/format';
import { getTemperatureBand } from '../utils/temperature';
import { SkeletonBlock } from './Skeleton';

interface ComparisonTableProps {
  locations: ComparisonLocation[];
}

interface ColumnState {
  location: ComparisonLocation;
  data?: WeatherData;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

type HighlightMetric = 'temperature' | 'humidity';

const HIGHLIGHT_RULES = {
  temperature: [
    { key: 'warmest', className: 'comparison-cell--warmest', label: 'warmest' },
    { key: 'coldest', className: 'comparison-cell--coldest', label: 'coldest' },
  ],
  humidity: [
    { key: 'highestHumidity', className: 'comparison-cell--highest-humidity', label: 'highest humidity' },
    { key: 'lowestHumidity', className: 'comparison-cell--lowest-humidity', label: 'lowest humidity' },
  ],
} as const;

const highlightsFor = (metric: HighlightMetric, id: string, highlights: ComparisonHighlights) =>
  HIGHLIGHT_RULES[metric]
    .filter((rule) => highlights[rule.key].includes(id))
    .reduce(
      (acc, rule) => ({ classes: [...acc.classes, rule.className], labels: [...acc.labels, rule.label] }),
      { classes: [] as string[], labels: [] as string[] },
    );

const Skeleton: React.FC = () => (
  <span className="comparison-skeleton">
    <SkeletonBlock width="48px" height="0.9rem" />
    <span className="sr-only">Loading</span>
  </span>
);

const MissingValue: React.FC = () => <span className="comparison-missing">—</span>;

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ locations }) => {
  const results = useQueries({ queries: locations.map((location) => weatherQueryOptions(location)) });

  const columns: ColumnState[] = locations.map((location, index) => ({
    location,
    data: results[index].data,
    isLoading: results[index].isLoading,
    isError: results[index].isError,
    refetch: () => {
      void results[index].refetch();
    },
  }));

  const highlights = findHighlights(
    columns.map((column) => ({
      id: column.location.id,
      temperature: column.data?.temperature,
      humidity: column.data?.humidity,
    })),
  );

  const showSourceRow = columns.some((column) => column.data?.source);
  const showFrostRow = columns.some((column) => column.data?.frost_advisory);

  const renderCell = (column: ColumnState, content: React.ReactNode, className?: string) => (
    <td key={column.location.id} className={className}>
      {column.isLoading ? <Skeleton /> : column.isError ? <MissingValue /> : content}
    </td>
  );

  const renderHighlighted = (column: ColumnState, metric: HighlightMetric, content: React.ReactNode) => {
    const { classes, labels } = highlightsFor(metric, column.location.id, highlights);
    return renderCell(
      column,
      <>
        {content}
        {labels.map((label) => (
          <span key={label} className="sr-only">
            {label}
          </span>
        ))}
      </>,
      classes.join(' ') || undefined,
    );
  };

  return (
    <div className="comparison-table-wrapper" aria-busy={columns.some((column) => column.isLoading)}>
      <table className="comparison-table">
        <caption className="sr-only">
          Weather comparison for {locations.length} location{locations.length === 1 ? '' : 's'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            {columns.map((column) => (
              <th scope="col" key={column.location.id}>
                {formatLocationLabel(column.location)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Temperature</th>
            {columns.map((column) => {
              const band = column.data ? getTemperatureBand(column.data.temperature) : null;
              const { classes, labels } = highlightsFor('temperature', column.location.id, highlights);
              const className = [
                ...classes,
                band ? `comparison-cell--${band.band}` : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <td key={column.location.id} className={className || undefined}>
                  {column.isLoading ? (
                    <Skeleton />
                  ) : column.isError ? (
                    <span className="comparison-error">
                      <span>Couldn't load</span>
                      <button type="button" onClick={column.refetch}>
                        Retry
                      </button>
                    </span>
                  ) : column.data ? (
                    <>
                      <span>{column.data.temperature}°F</span>
                      {labels.map((label) => (
                        <span key={label} className="sr-only">
                          {label}
                        </span>
                      ))}
                    </>
                  ) : (
                    <MissingValue />
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <th scope="row">Feels like</th>
            {columns.map((column) =>
              renderCell(
                column,
                column.data ? <span>{column.data.apparentTemperature}°F</span> : <MissingValue />,
              ),
            )}
          </tr>
          <tr>
            <th scope="row">Humidity</th>
            {columns.map((column) =>
              renderHighlighted(
                column,
                'humidity',
                column.data ? <span>{formatHumidity(column.data.humidity)}</span> : <MissingValue />,
              ),
            )}
          </tr>
          <tr>
            <th scope="row">Conditions</th>
            {columns.map((column) =>
              renderCell(column, column.data ? <span>{column.data.description}</span> : <MissingValue />),
            )}
          </tr>
          {showSourceRow && (
            <tr>
              <th scope="row">Source</th>
              {columns.map((column) =>
                renderCell(column, column.data?.source ? <span>{column.data.source}</span> : <MissingValue />),
              )}
            </tr>
          )}
          {showFrostRow && (
            <tr>
              <th scope="row">Frost advisory</th>
              {columns.map((column) =>
                renderCell(
                  column,
                  column.data?.frost_advisory ? (
                    <span>{column.data.frost_advisory}</span>
                  ) : (
                    <MissingValue />
                  ),
                ),
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
