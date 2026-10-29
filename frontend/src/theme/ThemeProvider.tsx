import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  ThemeContext,
  readStoredTheme,
  resolveTheme,
  systemPrefersDark,
} from '../hooks/useTheme';
import type { ThemeMode } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setStoredMode] = useState<ThemeMode>(readStoredTheme);
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark);

  const resolvedTheme = resolveTheme(mode, prefersDark);

  // `data-theme` selects the token block, which owns the matching `color-scheme`, so native
  // controls (inputs, scrollbars) follow the theme as well.
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  // `system` mode has to follow the OS switch while the app is open.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia(DARK_MEDIA_QUERY);
    setPrefersDark(query.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setStoredMode(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persisting is best effort; the in-memory mode still applies.
    }
  }, []);

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
