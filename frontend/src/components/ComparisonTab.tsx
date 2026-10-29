import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Coordinates } from '../api/weatherClient';
import { useVirtualList } from '../hooks/useVirtualList';
import { MAX_COMPARISON_LOCATIONS } from '../hooks/useComparisonLocations';
import type { AddLocationResult, ComparisonLocationsState } from '../hooks/useComparisonLocations';
import { useFavoriteCombinations } from '../hooks/useFavoriteCombinations';
import type { FavoriteCombination, SaveFavoriteResult } from '../hooks/useFavoriteCombinations';
import { formatLocationLabel } from '../utils/coordinates';
import { ComparisonTable } from './ComparisonTable';
import { LocationPicker } from './LocationPicker';

const FAVORITE_ROW_ESTIMATE_PX = 64;

const favoriteKey = (favorite: FavoriteCombination) => favorite.id;

const ADD_MESSAGES: Record<AddLocationResult, string | null> = {
  added: null,
  duplicate: 'That location is already in the comparison.',
  'limit-reached': `You can compare a maximum of ${MAX_COMPARISON_LOCATIONS} locations.`,
  invalid: 'Enter a latitude between -90 and 90 and a longitude between -180 and 180.',
};

const SAVE_MESSAGES: Record<SaveFavoriteResult, string> = {
  saved: 'Combination saved to your favorites.',
  'invalid-name': 'Enter a name for the combination.',
  'invalid-locations': 'Add between 1 and 5 valid locations before saving.',
  'duplicate-locations': 'A favorite cannot contain the same location twice.',
  'storage-error': 'Could not save to this browser storage.',
};

export const ComparisonTab: React.FC<{ comparison: ComparisonLocationsState }> = ({ comparison }) => {
  const { locations, add, remove, replaceAll } = comparison;
  const { favorites, save, load, remove: removeFavorite } = useFavoriteCombinations();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [favoriteName, setFavoriteName] = useState('');

  const { isVirtualized, containerRef, rows, totalSize, onFocusCapture, onBlurCapture } =
    useVirtualList<FavoriteCombination, HTMLUListElement>({
      items: favorites,
      estimateSize: FAVORITE_ROW_ESTIMATE_PX,
      getKey: favoriteKey,
    });

  const addLocation = useCallback(
    (coordinates: Coordinates) => {
      setMessage(ADD_MESSAGES[add(coordinates)]);
    },
    [add],
  );

  const saveFavorite = useCallback(() => {
    const result = save(
      favoriteName,
      locations.map((location) => ({ lat: location.lat, lng: location.lng })),
    );
    setMessage(SAVE_MESSAGES[result]);
    if (result === 'saved') {
      setFavoriteName('');
    }
  }, [favoriteName, locations, save]);

  const loadFavorite = useCallback(
    (id: string) => {
      const restored = load(id);
      if (restored) {
        replaceAll(restored);
        setMessage('Combination loaded.');
      }
    },
    [load, replaceAll],
  );

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['weather'] });
  }, [queryClient]);

  return (
    <div id="tabpanel-compare" role="tabpanel" aria-labelledby="tab-compare" className="compare-tab">
      <section className="compare-editor">
        <h2>Add a location</h2>
        <p className="compare-count">
          {locations.length}/{MAX_COMPARISON_LOCATIONS} locations
        </p>
        <LocationPicker onSelect={addLocation} submitLabel="Add to comparison" />
        {message && (
          <p className="compare-message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="compare-locations">
        <div className="compare-locations__header">
          <h2>Comparison</h2>
          <button
            type="button"
            className="compare-refresh"
            onClick={refreshAll}
            disabled={locations.length === 0}
          >
            Refresh all
          </button>
        </div>

        {locations.length === 0 ? (
          <p className="compare-empty">
            Add up to {MAX_COMPARISON_LOCATIONS} locations to compare their weather side by side.
          </p>
        ) : (
          <>
            <ul className="compare-chips">
              {locations.map((location) => (
                <li key={location.id} className="compare-chip">
                  <span>{formatLocationLabel(location)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${formatLocationLabel(location)}`}
                    onClick={() => remove(location.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <ComparisonTable locations={locations} />
          </>
        )}
      </section>

      <section className="favorites">
        <h2>Saved combinations</h2>
        <div className="favorites-save">
          <label htmlFor="favorite-name">Name</label>
          <input
            id="favorite-name"
            value={favoriteName}
            onChange={(event) => setFavoriteName(event.target.value)}
            placeholder="Home &amp; Work"
          />
          <button type="button" onClick={saveFavorite}>
            Save combination
          </button>
        </div>

        {favorites.length === 0 ? (
          <p className="favorites-empty">No saved combinations yet.</p>
        ) : (
          <ul
            ref={containerRef}
            className={`favorites-list${isVirtualized ? ' favorites-list--virtual' : ''}`}
            style={isVirtualized ? { height: totalSize } : undefined}
            onFocus={onFocusCapture}
            onBlur={onBlurCapture}
          >
            {rows.map((row) => (
              <li
                key={row.key}
                data-index={row.index}
                className="favorites-list__item"
                aria-posinset={isVirtualized ? row.index + 1 : undefined}
                aria-setsize={isVirtualized ? favorites.length : undefined}
                style={
                  isVirtualized
                    ? { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }
                    : undefined
                }
              >
                <div className="favorites-list__details">
                  <span className="favorites-list__name">{row.item.name}</span>
                  <span className="favorites-list__meta">
                    {row.item.locations.length} location
                    {row.item.locations.length === 1 ? '' : 's'} · saved{' '}
                    {row.item.savedAt.slice(0, 10)}
                  </span>
                </div>
                <div className="favorites-list__actions">
                  <button type="button" onClick={() => loadFavorite(row.item.id)}>
                    Load
                  </button>
                  <button type="button" onClick={() => removeFavorite(row.item.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
