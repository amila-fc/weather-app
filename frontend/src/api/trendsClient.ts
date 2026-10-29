import axios from 'axios';
import type { Coordinates } from './weatherClient';

const API_BASE = '/api';

/** One hour of the trends series, as returned by GET /api/weather/trends. */
export interface HourlyWeatherPoint {
  time: string;
  temperature: number;
  humidity: number;
  windSpeedMph: number;
  windDirectionDegrees: number;
  feelsLikeTemperature: number;
}

export interface TrendsCurrent {
  temperature: number;
  humidity: number;
  windSpeedMph: number;
  windDirectionDegrees: number;
  feelsLikeTemperature: number;
  description: string;
}

export interface WeatherTrends {
  latitude: number;
  longitude: number;
  generatedAt: string;
  /** True while the backend generates the series instead of reading observations. */
  mock: boolean;
  hours: number;
  /** Offset the location's clock is displayed with; never the browser zone. */
  utcOffsetMinutes: number;
  current: TrendsCurrent;
  hourly: HourlyWeatherPoint[];
  sunrise: string | null;
  sunset: string | null;
  /** 'day' or 'night' inside the polar circles, otherwise null. */
  polar: 'day' | 'night' | null;
}

const trendsClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const trendsApi = {
  getTrends: async (coords: Coordinates, hours?: number): Promise<WeatherTrends> => {
    const response = await trendsClient.get('/weather/trends', {
      params: {
        lat: coords.lat,
        long: coords.lng,
        ...(hours === undefined ? {} : { hours }),
      },
    });
    return response.data;
  },
};

export default trendsApi;
