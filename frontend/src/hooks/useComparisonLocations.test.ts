import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_COMPARISON_LOCATIONS, useComparisonLocations } from './useComparisonLocations';
import type { AddLocationResult } from './useComparisonLocations';
import type { Coordinates } from '../api/weatherClient';

describe('useComparisonLocations', () => {
  const setup = () => {
    const { result } = renderHook(() => useComparisonLocations());

    let outcome: AddLocationResult = 'invalid';
    const add = (coordinates: Coordinates) => {
      act(() => {
        outcome = result.current.add(coordinates);
      });
      return outcome;
    };

    return { result, add };
  };

  it('accepts five locations and rejects the sixth', () => {
    const { result, add } = setup();

    for (let index = 0; index < MAX_COMPARISON_LOCATIONS; index += 1) {
      expect(add({ lat: index, lng: index })).toBe('added');
    }
    expect(add({ lat: 10, lng: 10 })).toBe('limit-reached');

    expect(result.current.locations).toHaveLength(MAX_COMPARISON_LOCATIONS);
    expect(result.current.isFull).toBe(true);
  });

  it('rejects a duplicate that only differs below the fourth decimal', () => {
    const { result, add } = setup();

    expect(add({ lat: 47, lng: 8 })).toBe('added');
    expect(add({ lat: 47.00001, lng: 8.00001 })).toBe('duplicate');

    expect(result.current.locations).toHaveLength(1);
    expect(result.current.locations[0]).toMatchObject({ lat: 47, lng: 8 });
  });

  it('rejects out-of-range and non-numeric coordinates', () => {
    const { result, add } = setup();

    expect(add({ lat: 100, lng: 8 })).toBe('invalid');
    expect(add({ lat: 47, lng: -180.5 })).toBe('invalid');
    expect(add({ lat: Number.NaN, lng: 8 })).toBe('invalid');

    expect(result.current.locations).toHaveLength(0);
  });

  it('removes a location by id', () => {
    const { result, add } = setup();

    add({ lat: 47, lng: 8 });
    add({ lat: 40.7128, lng: -74.006 });

    act(() => {
      result.current.remove('47.0000,8.0000');
    });

    expect(result.current.locations).toHaveLength(1);
    expect(result.current.locations[0].id).toBe('40.7128,-74.0060');
  });

  it('replaces the whole set, de-duplicating and capping it', () => {
    const { result } = setup();

    act(() => {
      result.current.replaceAll([
        { lat: 47, lng: 8 },
        { lat: 47.00001, lng: 8.00001 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
        { lat: 3, lng: 3 },
        { lat: 4, lng: 4 },
        { lat: 5, lng: 5 },
      ]);
    });

    expect(result.current.locations).toHaveLength(MAX_COMPARISON_LOCATIONS);
    expect(result.current.locations.map((location) => location.id)).toEqual([
      '47.0000,8.0000',
      '1.0000,1.0000',
      '2.0000,2.0000',
      '3.0000,3.0000',
      '4.0000,4.0000',
    ]);
  });
});
