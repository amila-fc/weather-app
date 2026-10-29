import { describe, expect, it } from 'vitest';
import {
  cardinalDirection,
  formatClockInOffset,
  formatHour,
  formatHumidity,
  formatMinutesAsHours,
  minutesBetween,
} from './format';

describe('formatHumidity', () => {
  it('rounds float noise to whole percent', () => {
    expect(formatHumidity(80.076106174296)).toBe('80%');
    expect(formatHumidity(65.0727539410455)).toBe('65%');
    expect(formatHumidity(65.5)).toBe('66%');
    expect(formatHumidity(0)).toBe('0%');
  });
});

describe('cardinalDirection', () => {
  it('maps the cardinal and intercardinal bearings', () => {
    expect(cardinalDirection(0)).toBe('N');
    expect(cardinalDirection(45)).toBe('NE');
    expect(cardinalDirection(90)).toBe('E');
    expect(cardinalDirection(180)).toBe('S');
    expect(cardinalDirection(270)).toBe('W');
    expect(cardinalDirection(360)).toBe('N');
  });

  it('rounds the 16-point sectors', () => {
    expect(cardinalDirection(285)).toBe('WNW');
    expect(cardinalDirection(11)).toBe('N');
    expect(cardinalDirection(12)).toBe('NNE');
  });

  it('normalises out-of-range and negative bearings', () => {
    expect(cardinalDirection(-90)).toBe('W');
    expect(cardinalDirection(450)).toBe('E');
  });
});

describe('formatHour', () => {
  it('reads the hour in the location offset, not the browser zone', () => {
    expect(formatHour('2026-10-29T01:00:00Z', -480)).toBe('17:00');
    expect(formatHour('2026-10-29T01:00:00Z', 0)).toBe('01:00');
    expect(formatHour('2026-10-29T01:00:00Z', 330)).toBe('06:00');
  });
});

describe('formatClockInOffset', () => {
  it('renders a 12-hour clock in the location offset', () => {
    expect(formatClockInOffset('2026-10-30T00:00:00Z', -480)).toBe('4:00 PM');
    expect(formatClockInOffset('2026-06-21T09:25:00Z', -240)).toBe('5:25 AM');
    expect(formatClockInOffset('2026-10-30T12:00:00Z', 0)).toBe('12:00 PM');
    expect(formatClockInOffset('2026-10-30T00:00:00Z', 0)).toBe('12:00 AM');
  });
});

describe('minutesBetween and formatMinutesAsHours', () => {
  it('measures the sunrise-to-sunset window', () => {
    expect(minutesBetween('2026-06-21T09:25:00Z', '2026-06-22T00:31:00Z')).toBe(906);
  });

  it('formats a duration for the day-length row', () => {
    expect(formatMinutesAsHours(906)).toBe('15h 06m');
    expect(formatMinutesAsHours(0)).toBe('0h 00m');
    expect(formatMinutesAsHours(1440)).toBe('24h 00m');
    expect(formatMinutesAsHours(725.9)).toBe('12h 06m');
  });
});
