import { memo, useCallback, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { WeatherData } from '../api/weatherClient';
import { weatherQueryKey, weatherQueryOptions } from '../api/weatherQuery';
import type { ComparisonLocation } from '../hooks/useComparisonLocations';
import type { ComparisonHighlights } from '../utils/comparison';
import { findHighlights } from '../utils/comparison';
import { formatLocationLabel } from '../utils/coordinates';
import { formatHumidity } from '../utils/format';
import { recordRender } from '../utils/renderCount';
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
}

const temperatureClasses = (highlights: ComparisonHighlights, id: string): string[] => {
  const classes: string[] = [];
  if (highlights.warmest.includes(id)) {
    classes.push('comparison-cell--warmest');
  }
  if (highlights.coldest.includes(id)) {
    classes.push('comparison-cell--coldest');
  }
  return classes;
};

const humidityClasses = (highlights: ComparisonHighlights, id: string): string[] => {
  const classes: string[] = [];
  if (highlights.highestHumidity.includes(id)) {
    classes.push('comparison-cell--highest-humidity');
  }
  if (highlights.lowestHumidity.includes(id)) {
    classes.push('comparison-cell--lowest-humidity');
  }
  return classes;
};

const Skeleton: React.FC = () => (
  <span className="comparison-skeleton">
    <SkeletonBlock width="48px" height="0.9rem" />
    <span className="sr-only">Loading</span>
  </span>
);

const MissingValue: React.FC = () => <span className="comparison-missing">—</span>;

interface ComparisonCellProps {
  latitude: number;
  longitude: number;
  /** Pre-formatted text, so the cell only ever compares primitives. */
  value: string | null;
  isLoading: boolean;
  isError: boolean;
  className?: string;
  isWarmest?: boolean;
  isColdest?: boolean;
  isHighestHumidity?: boolean;
  isLowestHumidity?: boolean;
  /** Only the temperature row offers the inline retry, matching the previous single affordance. */
  showRetry?: boolean;
}

/**
 * Memoised per cell: the table re-renders whenever any column's request settles or the tab's message
 * changes, while a single cell's props stay identical.
 */
const ComparisonCell: React.FC<ComparisonCellProps> = memo(function ComparisonCell({
  latitude,
  longitude,
  value,
  isLoading,
  isError,
  className,
  isWarmest = false,
  isColdest = false,
  isHighestHumidity = false,
  isLowestHumidity = false,
  showRetry = false,
}) {
  const queryClient = useQueryClient();
  recordRender('comparison-cell');

  // Retrying through the query client keeps this callback stable, so the memo never breaks on it.
  const retry = useCallback(() => {
    void queryClient.refetchQueries({ queryKey: weatherQueryKey({ lat: latitude, lng: longitude }) });
  }, [queryClient, latitude, longitude]);

  const labels = [
    isWarmest ? 'warmest' : null,
    isColdest ? 'coldest' : null,
    isHighestHumidity ? 'highest humidity' : null,
    isLowestHumidity ? 'lowest humidity' : null,
  ].filter((label): label is string => label !== null);

  return (
    <td className={className}>
      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        showRetry ? (
          <span className="comparison-error">
            <span>Couldn&apos;t load</span>
            <button type="button" onClick={retry}>
              Retry
            </button>
          </span>
        ) : (
          <MissingValue />
        )
      ) : value === null ? (
        <MissingValue />
      ) : (
        <>
          <span>{value}</span>
          {labels.map((label) => (
            <span key={label} className="sr-only">
              {label}
            </span>
          ))}
        </>
      )}
    </td>
  );
});

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ locations }) => {
  const results = useQueries({ queries: locations.map((location) => weatherQueryOptions(location)) });

  const columns = useMemo<ColumnState[]>(
    () =>
      locations.map((location, index) => ({
        location,
        data: results[index].data,
        isLoading: results[index].isLoading,
        isError: results[index].isError,
      })),
    [locations, results],
  );

  const highlights = useMemo(
    () =>
      findHighlights(
        columns.map((column) => ({
          id: column.location.id,
          temperature: column.data?.temperature,
          humidity: column.data?.humidity,
        })),
      ),
    [columns],
  );

  const showSourceRow = columns.some((column) => column.data?.source);
  const showFrostRow = columns.some((column) => column.data?.frost_advisory);

  // Deliberately not virtualized: at most 5 columns x ~7 rows, so a scroll window would add markup,
  // break the sticky metric column and gain nothing measurable.

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
            {columns.map((column) => (
              <ComparisonCell
                key={column.location.id}
                latitude={column.location.lat}
                longitude={column.location.lng}
                value={column.data ? `${column.data.temperature}°F` : null}
                isLoading={column.isLoading}
                isError={column.isError}
                className={
                  [
                    ...temperatureClasses(highlights, column.location.id),
                    column.data ? `comparison-cell--${getTemperatureBand(column.data.temperature).band}` : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                isWarmest={highlights.warmest.includes(column.location.id)}
                isColdest={highlights.coldest.includes(column.location.id)}
                showRetry
              />
            ))}
          </tr>
          <tr>
            <th scope="row">Feels like</th>
            {columns.map((column) => (
              <ComparisonCell
                key={column.location.id}
                latitude={column.location.lat}
                longitude={column.location.lng}
                value={column.data ? `${column.data.apparentTemperature}°F` : null}
                isLoading={column.isLoading}
                isError={column.isError}
              />
            ))}
          </tr>
          <tr>
            <th scope="row">Humidity</th>
            {columns.map((column) => (
              <ComparisonCell
                key={column.location.id}
                latitude={column.location.lat}
                longitude={column.location.lng}
                value={column.data ? formatHumidity(column.data.humidity) : null}
                isLoading={column.isLoading}
                isError={column.isError}
                className={humidityClasses(highlights, column.location.id).join(' ') || undefined}
                isHighestHumidity={highlights.highestHumidity.includes(column.location.id)}
                isLowestHumidity={highlights.lowestHumidity.includes(column.location.id)}
              />
            ))}
          </tr>
          <tr>
            <th scope="row">Conditions</th>
            {columns.map((column) => (
              <ComparisonCell
                key={column.location.id}
                latitude={column.location.lat}
                longitude={column.location.lng}
                value={column.data?.description ?? null}
                isLoading={column.isLoading}
                isError={column.isError}
              />
            ))}
          </tr>
          {showSourceRow && (
            <tr>
              <th scope="row">Source</th>
              {columns.map((column) => (
                <ComparisonCell
                  key={column.location.id}
                  latitude={column.location.lat}
                  longitude={column.location.lng}
                  value={column.data?.source ?? null}
                  isLoading={column.isLoading}
                  isError={column.isError}
                />
              ))}
            </tr>
          )}
          {showFrostRow && (
            <tr>
              <th scope="row">Frost advisory</th>
              {columns.map((column) => (
                <ComparisonCell
                  key={column.location.id}
                  latitude={column.location.lat}
                  longitude={column.location.lng}
                  value={column.data?.frost_advisory ?? null}
                  isLoading={column.isLoading}
                  isError={column.isError}
                />
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
