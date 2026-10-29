import { useMemo } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VIRTUALIZE_THRESHOLD, useVirtualList } from './useVirtualList';
import { stubVirtualViewport } from '../test/virtualViewport';

const ROW_HEIGHT = 40;
const VIEWPORT_HEIGHT = 400;

const Harness: React.FC<{ count: number }> = ({ count }) => {
  const items = useMemo(
    () => Array.from({ length: count }, (_, index) => `row-${index}`),
    [count],
  );

  const { isVirtualized, containerRef, rows, totalSize } = useVirtualList<string, HTMLUListElement>({
    items,
    estimateSize: ROW_HEIGHT,
    getKey: (item) => item,
  });

  return (
    <ul
      ref={containerRef}
      data-testid="list"
      data-virtualized={String(isVirtualized)}
      data-total-size={totalSize}
      style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}
    >
      {rows.map((row) => (
        <li
          key={row.key}
          data-index={row.index}
          aria-posinset={isVirtualized ? row.index + 1 : undefined}
          aria-setsize={isVirtualized ? items.length : undefined}
        >
          {row.item}
        </li>
      ))}
    </ul>
  );
};

const renderedRows = () => screen.queryAllByRole('listitem');

describe('useVirtualList', () => {
  let restoreViewport: () => void;

  beforeEach(() => {
    restoreViewport = stubVirtualViewport(VIEWPORT_HEIGHT);
  });

  afterEach(() => {
    restoreViewport();
  });

  it('renders every item below the threshold', () => {
    render(<Harness count={VIRTUALIZE_THRESHOLD} />);

    expect(screen.getByTestId('list')).toHaveAttribute('data-virtualized', 'false');
    expect(renderedRows()).toHaveLength(VIRTUALIZE_THRESHOLD);
    expect(renderedRows()[0]).not.toHaveAttribute('aria-posinset');
  });

  it('renders only a window of rows above the threshold', () => {
    render(<Harness count={200} />);

    const list = screen.getByTestId('list');
    expect(list).toHaveAttribute('data-virtualized', 'true');
    expect(Number(list.getAttribute('data-total-size'))).toBe(200 * ROW_HEIGHT);

    expect(renderedRows().length).toBeGreaterThan(0);
    expect(renderedRows().length).toBeLessThan(50);
    expect(screen.queryByText('row-199')).not.toBeInTheDocument();
  });

  it('announces the position inside the full set, not inside the window', () => {
    render(<Harness count={200} />);

    const [first] = renderedRows();
    expect(first).toHaveAttribute('aria-posinset', '1');
    expect(first).toHaveAttribute('aria-setsize', '200');
  });

  it('renders the next window after scrolling', () => {
    render(<Harness count={200} />);
    const list = screen.getByTestId('list');
    expect(screen.getByText('row-0')).toBeInTheDocument();

    list.scrollTop = 100 * ROW_HEIGHT;
    fireEvent.scroll(list);

    expect(screen.queryByText('row-0')).not.toBeInTheDocument();
    const positions = renderedRows().map((row) => Number(row.getAttribute('aria-posinset')));
    expect(Math.min(...positions)).toBeGreaterThan(50);
  });
});
