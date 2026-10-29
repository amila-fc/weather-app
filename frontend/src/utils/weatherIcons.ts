import clear from '../assets/weather/clear.svg';
import cloudy from '../assets/weather/cloudy.svg';
import fog from '../assets/weather/fog.svg';
import partlyCloudy from '../assets/weather/partly-cloudy.svg';
import rain from '../assets/weather/rain.svg';
import snow from '../assets/weather/snow.svg';
import thunderstorm from '../assets/weather/thunderstorm.svg';
import unknown from '../assets/weather/unknown.svg';
import wind from '../assets/weather/wind.svg';

export type WeatherIconName =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'fog'
  | 'wind'
  | 'unknown';

const ICON_SOURCES: Record<WeatherIconName, string> = {
  clear,
  'partly-cloudy': partlyCloudy,
  cloudy,
  rain,
  snow,
  thunderstorm,
  fog,
  wind,
  unknown,
};

const ICON_LABELS: Record<WeatherIconName, string> = {
  clear: 'Clear sky',
  'partly-cloudy': 'Partly cloudy sky',
  cloudy: 'Cloudy sky',
  rain: 'Rain',
  snow: 'Snow',
  thunderstorm: 'Thunderstorm',
  fog: 'Fog',
  wind: 'Windy',
  unknown: 'Current conditions',
};

// Order matters: the first match wins, so the most specific (and most hazardous) conditions come first.
const DESCRIPTION_RULES: ReadonlyArray<{ pattern: RegExp; icon: WeatherIconName }> = [
  { pattern: /thunder|tstorm|lightning/i, icon: 'thunderstorm' },
  { pattern: /snow|sleet|flurr|blizzard|ice pellets|freezing rain/i, icon: 'snow' },
  { pattern: /rain|shower|drizzle|precip/i, icon: 'rain' },
  { pattern: /fog|mist|haze|smoke/i, icon: 'fog' },
  { pattern: /wind|breez|gust/i, icon: 'wind' },
  { pattern: /partly|mostly sunny|few clouds|scattered/i, icon: 'partly-cloudy' },
  { pattern: /clear|sunny|fair/i, icon: 'clear' },
  { pattern: /cloud|overcast/i, icon: 'cloudy' },
];

/** Maps a provider description to a local icon; anything unrecognised falls back to a neutral one. */
export function weatherIconFor(description: string | null | undefined): WeatherIconName {
  if (!description) {
    return 'unknown';
  }
  const match = DESCRIPTION_RULES.find((rule) => rule.pattern.test(description));
  return match ? match.icon : 'unknown';
}

export function weatherIconSource(icon: WeatherIconName): string {
  return ICON_SOURCES[icon];
}

export function weatherIconLabel(icon: WeatherIconName): string {
  return ICON_LABELS[icon];
}
