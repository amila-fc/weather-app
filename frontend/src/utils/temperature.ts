export type TemperatureBand = 'freezing' | 'cold' | 'mild' | 'warm' | 'hot';

export interface TemperatureBandStyle {
  band: TemperatureBand;
  color: string;
}

const BAND_COLORS: Record<TemperatureBand, string> = {
  freezing: '#1d4ed8',
  cold: '#0891b2',
  mild: '#15803d',
  warm: '#ea580c',
  hot: '#dc2626',
};

/**
 * Classifies a temperature in °F. Each band includes its lower bound and excludes the next one up, so
 * 31.9 is freezing, 32 is cold, 49.9 is cold, 50 is mild, 69.9 is mild, 70 is warm, 84.9 is warm and
 * 85 is hot.
 */
export function getTemperatureBand(temperatureFahrenheit: number): TemperatureBandStyle {
  if (temperatureFahrenheit < 32) {
    return { band: 'freezing', color: BAND_COLORS.freezing };
  }
  if (temperatureFahrenheit < 50) {
    return { band: 'cold', color: BAND_COLORS.cold };
  }
  if (temperatureFahrenheit < 70) {
    return { band: 'mild', color: BAND_COLORS.mild };
  }
  if (temperatureFahrenheit < 85) {
    return { band: 'warm', color: BAND_COLORS.warm };
  }
  return { band: 'hot', color: BAND_COLORS.hot };
}

/**
 * Rounds a coordinate to 4 decimals, the precision the backend uses for its cache and history keys.
 */
export function roundCoordinate(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
