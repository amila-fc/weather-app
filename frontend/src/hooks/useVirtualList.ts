import { useCallback, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Lists this short stay in plain DOM: virtualization would add a scroll container and absolutely
 * positioned rows for no measurable win, and it would make the markup harder to test.
 */
export const VIRTUALIZE_THRESHOLD = 20;

const DEFAULT_ROW_HEIGHT = 64;
const DEFAULT_OVERSCAN = 5;

export interface VirtualRow<T> {
  index: number;
  item: T;
  key: string;
  start: number;
  size: number;
}

export interface VirtualListOptions<T> {
  items: readonly T[];
  estimateSize?: number;
  getKey: (item: T, index: number) => string;
  overscan?: number;
}

export interface VirtualListResult<T, E extends HTMLElement> {
  /** False means the caller should render every item in normal flow. */
  isVirtualized: boolean;
  containerRef: React.RefObject<E>;
  rows: VirtualRow<T>[];
  /** Height of the scrollable inner area; only meaningful when virtualized. */
  totalSize: number;
  onFocusCapture: (event: React.FocusEvent<HTMLElement>) => void;
  onBlurCapture: (event: React.FocusEvent<HTMLElement>) => void;
}

/**
 * Thin wrapper around `@tanstack/react-virtual`: below `VIRTUALIZE_THRESHOLD` items it hands back the
 * whole list, above it only the rows inside the scroll window (plus the focused row, which is pinned so
 * keyboard focus survives scrolling).
 */
export function useVirtualList<T, E extends HTMLElement = HTMLElement>({
  items,
  estimateSize = DEFAULT_ROW_HEIGHT,
  getKey,
  overscan = DEFAULT_OVERSCAN,
}: VirtualListOptions<T>): VirtualListResult<T, E> {
  const containerRef = useRef<E>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const isVirtualized = items.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateSize,
    overscan,
    enabled: isVirtualized,
  });

  const onFocusCapture = useCallback((event: React.FocusEvent<HTMLElement>) => {
    const row = (event.target as HTMLElement).closest('[data-index]');
    const index = row ? Number(row.getAttribute('data-index')) : Number.NaN;
    if (Number.isInteger(index)) {
      setFocusedIndex(index);
    }
  }, []);

  const onBlurCapture = useCallback((event: React.FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) {
      setFocusedIndex(null);
    }
  }, []);

  if (!isVirtualized) {
    return {
      isVirtualized,
      containerRef,
      rows: items.map((item, index) => ({
        index,
        item,
        key: getKey(item, index),
        start: index * estimateSize,
        size: estimateSize,
      })),
      totalSize: items.length * estimateSize,
      onFocusCapture,
      onBlurCapture,
    };
  }

  const rows: VirtualRow<T>[] = virtualizer.getVirtualItems().map((virtualRow) => ({
    index: virtualRow.index,
    item: items[virtualRow.index],
    key: getKey(items[virtualRow.index], virtualRow.index),
    start: virtualRow.start,
    size: virtualRow.size,
  }));

  if (
    focusedIndex !== null &&
    focusedIndex < items.length &&
    !rows.some((row) => row.index === focusedIndex)
  ) {
    rows.push({
      index: focusedIndex,
      item: items[focusedIndex],
      key: getKey(items[focusedIndex], focusedIndex),
      start: focusedIndex * estimateSize,
      size: estimateSize,
    });
    rows.sort((a, b) => a.index - b.index);
  }

  return {
    isVirtualized,
    containerRef,
    rows,
    totalSize: virtualizer.getTotalSize(),
    onFocusCapture,
    onBlurCapture,
  };
}
