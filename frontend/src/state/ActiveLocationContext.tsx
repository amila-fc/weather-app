import { createContext, useContext, useMemo, useState } from 'react';
import type { Coordinates } from '../api/weatherClient';

const DEFAULT_ACTIVE_LOCATION: Coordinates = {
  lat: 37.7749, // Default: San Francisco
  lng: -122.4194,
};

interface ActiveLocationContextValue {
  location: Coordinates;
  setLocation: (coordinates: Coordinates) => void;
}

const ActiveLocationContext = createContext<ActiveLocationContextValue | null>(null);

export const ActiveLocationProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<Coordinates>(DEFAULT_ACTIVE_LOCATION);
  const value = useMemo(() => ({ location, setLocation }), [location]);

  return <ActiveLocationContext.Provider value={value}>{children}</ActiveLocationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useActiveLocation(): ActiveLocationContextValue {
  const value = useContext(ActiveLocationContext);
  if (!value) {
    throw new Error('useActiveLocation must be used inside an ActiveLocationProvider');
  }
  return value;
}
