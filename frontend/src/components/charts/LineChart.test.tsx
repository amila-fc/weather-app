import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LineChart } from './LineChart';
import type { ChartPoint } from './LineChart';

const hour = (index: number) => `2026-10-29T${String(index).padStart(2, '0')}:00:00Z`;

const points: ChartPoint[] = Array.from({ length: 24 }, (_, index) => ({
  time: hour(index),
  value: 50 + index,
}));

const renderChart = (chartPoints: ChartPoint[] = points) =>
  render(
    <LineChart
      title="Temperature"
      unit="°F"
      points={chartPoints}
      utcOffsetMinutes={0}
      summary="Lowest 50°F, highest 73°F over 24 hours."
    />,
  );

describe('LineChart', () => {
  it('exposes the chart as an image with a written summary', () => {
    renderChart();

    expect(
      screen.getByRole('img', { name: /temperature chart\. lowest 50°f, highest 73°f/i }),
    ).toBeInTheDocument();
  });

  it('draws one point per hourly value', () => {
    const { container } = renderChart();

    expect(container.querySelectorAll('.line-chart__dot')).toHaveLength(points.length);
    const line = container.querySelector('.line-chart__line');
    expect(line?.getAttribute('points')?.split(' ')).toHaveLength(points.length);
  });

  it('provides a screen-reader table whose values match the payload one-for-one', () => {
    renderChart();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(points.length + 1);

    const firstValueRow = rows[1];
    expect(firstValueRow).toHaveTextContent('00:00');
    expect(firstValueRow).toHaveTextContent('50');

    const lastValueRow = rows[rows.length - 1];
    expect(lastValueRow).toHaveTextContent('23:00');
    expect(lastValueRow).toHaveTextContent('73');
  });

  it('renders hour ticks in the location offset', () => {
    const { container } = renderChart();

    const labels = Array.from(container.querySelectorAll('.line-chart__tick'))
      .map((node) => node.textContent)
      .filter((text) => text?.includes(':'));

    expect(labels).toContain('00:00');
    expect(labels).toContain('06:00');
    expect(labels).toContain('23:00');
  });

  it('uses a responsive viewBox rather than fixed pixel sizes', () => {
    const { container } = renderChart();
    const svg = container.querySelector('.line-chart__svg');

    expect(svg).toHaveAttribute('viewBox');
    expect(svg).not.toHaveAttribute('width');
    expect(svg).not.toHaveAttribute('height');
  });

  it('handles a single point without dividing by zero', () => {
    const { container } = renderChart([{ time: hour(5), value: 61 }]);

    expect(container.querySelectorAll('.line-chart__dot')).toHaveLength(1);
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
