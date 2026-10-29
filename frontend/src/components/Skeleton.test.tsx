import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkeletonBlock, SkeletonText } from './Skeleton';

describe('Skeleton', () => {
  it('renders a decorative block at the requested size', () => {
    const { container } = render(<SkeletonBlock width="80px" height="2rem" />);
    const block = container.querySelector('.skeleton');

    expect(block).toHaveAttribute('aria-hidden', 'true');
    expect(block).toHaveStyle({ width: '80px', height: '2rem' });
  });

  it('renders one line per requested row, hidden from assistive tech', () => {
    const { container } = render(<SkeletonText lines={4} />);

    expect(container.querySelectorAll('.skeleton--text')).toHaveLength(4);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
