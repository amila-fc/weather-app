import axios from 'axios';

const API_BASE = '/api';

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  apparentTemperature: number;
  summary: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

const weatherClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const weatherApi = {
  getWeather: async (coords: Coordinates): Promise<WeatherData> => {
    const response = await weatherClient.get('/weather', {
      params: {
        lat: coords.lat,
        long: coords.lng,
      },
    });
    return response.data;
  },

  getStatus: async (): Promise<string> => {
    const response = await weatherClient.get('/status');
    return response.data;
  },
};

export default weatherApi;