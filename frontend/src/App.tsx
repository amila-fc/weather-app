import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WeatherDisplay } from './components/WeatherDisplay';
import { weatherApi, Coordinates } from './api/weatherClient';
import './App.css';

function App() {
  const [coordinates, setCoordinates] = useState<Coordinates>({
    lat: 37.7749,  // Default: San Francisco
    lng: -122.4194,
  });
  const [inputLat, setInputLat] = useState(coordinates.lat.toString());
  const [inputLng, setInputLng] = useState(coordinates.lng.toString());

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: weatherApi.getStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates({ lat, lng });
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setInputLat(latitude.toString());
          setInputLng(longitude.toString());
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Weather App</h1>
        {status && <div className="server-status">Server Status: {status}</div>}
      </header>

      <main className="app-main">
        <div className="coordinates-form">
          <h2>Enter Location</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="latitude">Latitude:</label>
              <input
                type="number"
                id="latitude"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                step="0.0001"
                min="-90"
                max="90"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude:</label>
              <input
                type="number"
                id="longitude"
                value={inputLng}
                onChange={(e) => setInputLng(e.target.value)}
                step="0.0001"
                min="-180"
                max="180"
                required
              />
            </div>
            <div className="form-buttons">
              <button type="submit">Get Weather</button>
              <button type="button" onClick={useCurrentLocation}>
                Use My Location
              </button>
            </div>
          </form>
        </div>

        <WeatherDisplay coordinates={coordinates} />
      </main>
    </div>
  );
}

export default App;