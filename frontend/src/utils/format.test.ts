import { describe, expect, it } from 'vitest';
import { formatHumidity } from './format';

describe('formatHumidity', () => {
  it('rounds float noise to whole percent', () => {
    expect(formatHumidity(80.076106174296)).toBe('80%');
    expect(formatHumidity(65.0727539410455)).toBe('65%');
    expect(formatHumidity(65.5)).toBe('66%');
    expect(formatHumidity(0)).toBe('0%');
  });
});
