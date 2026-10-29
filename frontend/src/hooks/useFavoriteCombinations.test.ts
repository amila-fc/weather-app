import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAVORITES_STORAGE_KEY, useFavoriteCombinations } from './useFavoriteCombinations';
import type { SaveFavoriteResult } from './useFavoriteCombinations';

const HOME_AND_WORK = [
  { lat: 47, lng: 8 },
  { lat: 47.37, lng: 8.54 },
];

describe('useFavoriteCombinations', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves a combination and reads it back after a reload', () => {
    const first = renderHook(() => useFavoriteCombinations());
    let outcome: SaveFavoriteResult = 'storage-error';

    act(() => {
      outcome = first.result.current.save('Home & Work', HOME_AND_WORK);
    });

    expect(outcome).toBe('saved');
    expect(first.result.current.favorites).toHaveLength(1);
    expect(first.result.current.favorites[0]).toMatchObject({
      name: 'Home & Work',
      locations: HOME_AND_WORK,
    });

    const afterReload = renderHook(() => useFavoriteCombinations());
    expect(afterReload.result.current.favorites).toHaveLength(1);
    expect(afterReload.result.current.favorites[0].locations).toEqual(HOME_AND_WORK);
    expect(window.localStorage.getItem(FAVORITES_STORAGE_KEY)).toContain('Home & Work');
  });

  it('loads a saved combination and deletes it', () => {
    const { result } = renderHook(() => useFavoriteCombinations());

    act(() => {
      result.current.save('Home & Work', HOME_AND_WORK);
    });
    const id = result.current.favorites[0].id;

    let loaded: ReturnType<typeof result.current.load> = null;
    act(() => {
      loaded = result.current.load(id);
    });
    expect(loaded).toEqual(HOME_AND_WORK);
    expect(result.current.load('unknown')).toBeNull();

    act(() => {
      result.current.remove(id);
    });
    expect(result.current.favorites).toHaveLength(0);
    expect(window.localStorage.getItem(FAVORITES_STORAGE_KEY)).not.toContain('Home & Work');
  });

  it('rejects an empty name, an empty set and duplicate locations', () => {
    const { result } = renderHook(() => useFavoriteCombinations());

    expect(result.current.save('   ', HOME_AND_WORK)).toBe('invalid-name');
    expect(result.current.save('Nothing', [])).toBe('invalid-locations');
    expect(result.current.save('Out of range', [{ lat: 100, lng: 8 }])).toBe('invalid-locations');
    expect(result.current.save('Twice', [{ lat: 47, lng: 8 }, { lat: 47.00001, lng: 8.00001 }])).toBe(
      'duplicate-locations',
    );

    expect(result.current.favorites).toHaveLength(0);
  });

  it('ignores corrupted or legacy stored values instead of throwing', () => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, '{not json');
    expect(renderHook(() => useFavoriteCombinations()).result.current.favorites).toEqual([]);

    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({ version: 99, combinations: [{ id: 'a', name: 'Old', savedAt: '', locations: [{ lat: 1, lng: 1 }] }] }),
    );
    expect(renderHook(() => useFavoriteCombinations()).result.current.favorites).toEqual([]);

    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({ version: 1, combinations: [{ id: 'a', name: 'Broken', savedAt: '', locations: [{ lat: 'x' }] }] }),
    );
    expect(renderHook(() => useFavoriteCombinations()).result.current.favorites).toEqual([]);
  });

  it('reports a storage error instead of crashing when localStorage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useFavoriteCombinations());
    let outcome: SaveFavoriteResult = 'saved';

    act(() => {
      outcome = result.current.save('Home & Work', HOME_AND_WORK);
    });

    expect(outcome).toBe('storage-error');
    expect(result.current.favorites).toHaveLength(0);
  });
});
