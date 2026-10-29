import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SunTimes } from './SunTimes';

describe('SunTimes', () => {
  it('renders sunrise and sunset in the location offset instead of the browser zone', () => {
    render(
      <SunTimes
        sunrise="2026-10-30T14:31:00Z"
        sunset="2026-10-31T01:12:00Z"
        utcOffsetMinutes={-420}
        polar={null}
      />,
    );

    expect(screen.getByText('7:31 AM')).toBeInTheDocument();
    expect(screen.getByText('6:12 PM')).toBeInTheDocument();
    expect(screen.getByText('10h 41m')).toBeInTheDocument();
  });

  it('explains a polar day instead of showing an empty sunset', () => {
    render(<SunTimes sunrise={null} sunset={null} utcOffsetMinutes={60} polar="day" />);

    expect(screen.getByText('Polar day — no sunset')).toBeInTheDocument();
    expect(screen.getByText('24h 00m')).toBeInTheDocument();
  });

  it('explains a polar night instead of showing an empty sunrise', () => {
    render(<SunTimes sunrise={null} sunset={null} utcOffsetMinutes={60} polar="night" />);

    expect(screen.getByText('Polar night — no sunrise')).toBeInTheDocument();
    expect(screen.getByText('0h 00m')).toBeInTheDocument();
  });

  it('falls back to a neutral label for a null time with no polar state', () => {
    render(<SunTimes sunrise={null} sunset="2026-10-31T01:12:00Z" utcOffsetMinutes={0} polar={null} />);

    expect(screen.getByText('No sunrise')).toBeInTheDocument();
    expect(screen.getByText('1:12 AM')).toBeInTheDocument();
  });
});
