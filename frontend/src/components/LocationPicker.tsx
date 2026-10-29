import { useEffect, useState } from 'react';
import type { Coordinates } from '../api/weatherClient';
import { isValidLatitude, isValidLongitude, roundCoordinate } from '../utils/coordinates';

interface LocationPickerProps {
  /** When provided the inputs follow this value (the map selection in the current-weather tab). */
  value?: Coordinates;
  onSelect: (coordinates: Coordinates) => void;
  submitLabel: string;
}

const INVALID_MESSAGE =
  'Enter a latitude between -90 and 90 and a longitude between -180 and 180.';

export const LocationPicker: React.FC<LocationPickerProps> = ({ value, onSelect, submitLabel }) => {
  const [inputLat, setInputLat] = useState(value ? String(value.lat) : '');
  const [inputLng, setInputLng] = useState(value ? String(value.lng) : '');
  const [error, setError] = useState<string | null>(null);

  const valueLat = value?.lat;
  const valueLng = value?.lng;

  useEffect(() => {
    if (valueLat === undefined || valueLng === undefined) {
      return;
    }
    setInputLat(String(valueLat));
    setInputLng(String(valueLng));
  }, [valueLat, valueLng]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const lat = Number(inputLat);
    const lng = Number(inputLng);

    if (inputLat.trim() === '' || inputLng.trim() === '' || !isValidLatitude(lat) || !isValidLongitude(lng)) {
      setError(INVALID_MESSAGE);
      return;
    }

    setError(null);
    onSelect({ lat: roundCoordinate(lat), lng: roundCoordinate(lng) });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setError(null);
        onSelect({
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
        });
      },
      () => setError('Unable to get your location.'),
    );
  };

  return (
    // noValidate: the picker validates itself, so a step/range mismatch produces our field-level message
    // instead of the browser's native bubble silencing the submit.
    <form onSubmit={handleSubmit} noValidate>
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
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coordinates-error' : undefined}
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
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coordinates-error' : undefined}
        />
      </div>
      {error && (
        <p className="form-error" id="coordinates-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-buttons">
        <button type="submit">{submitLabel}</button>
        <button type="button" onClick={useCurrentLocation}>
          Use My Location
        </button>
      </div>
    </form>
  );
};
