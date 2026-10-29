import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WindIndicator } from './WindIndicator';

const arrow = () => document.querySelector('.wind-indicator__arrow') as HTMLElement | null;

describe('WindIndicator', () => {
  it.each([
    [0, '0deg', 'N'],
    [90, '90deg', 'E'],
    [180, '180deg', 'S'],
    [270, '270deg', 'W'],
    [285, '285deg', 'WNW'],
  ])('rotates the needle to %i degrees', (degrees, rotation, cardinal) => {
    render(<WindIndicator speedMph={9.4} directionDegrees={degrees} />);

    expect(arrow()).toHaveStyle({ transform: `rotate(${rotation})` });
    expect(screen.getByText(`from ${cardinal}`)).toBeInTheDocument();
  });

  it('shows the speed in mph', () => {
    render(<WindIndicator speedMph={9.44} directionDegrees={285} />);

    expect(screen.getByText('9.4 mph')).toBeInTheDocument();
  });

  it('carries a descriptive label naming the direction in words', () => {
    render(<WindIndicator speedMph={9} directionDegrees={285} />);

    expect(screen.getByLabelText('Wind 9 mph from the west-northwest')).toBeInTheDocument();
  });

  it('renders "Calm" without a needle when there is no wind', () => {
    render(<WindIndicator speedMph={0} directionDegrees={200} />);

    expect(screen.getByText('Calm')).toBeInTheDocument();
    expect(arrow()).toBeNull();
    expect(screen.getByLabelText('Wind: calm')).toBeInTheDocument();
  });

  it('normalises bearings outside 0..360', () => {
    render(<WindIndicator speedMph={4} directionDegrees={-15} />);

    expect(arrow()).toHaveStyle({ transform: 'rotate(345deg)' });
    expect(screen.getByText('from NNW')).toBeInTheDocument();
  });
});
