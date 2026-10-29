import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** What the user picked: an explicit theme or "follow the OS". */
  mode: ThemeMode;
  /** What is actually rendered right now. */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = 'weather-app:theme:v1';
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && (THEME_MODES as string[]).includes(value);

/** Corrupt or absent storage falls back to `system`. */
export const parseStoredTheme = (raw: string | null): ThemeMode =>
  isThemeMode(raw) ? raw : 'system';

export const readStoredTheme = (): ThemeMode => {
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return 'system';
  }
};

/** Cycle order required by the toggle: light → dark → system → light. */
export const nextThemeMode = (mode: ThemeMode): ThemeMode => {
  if (mode === 'light') {
    return 'dark';
  }
  return mode === 'dark' ? 'system' : 'light';
};

export const resolveTheme = (mode: ThemeMode, prefersDark: boolean): ResolvedTheme =>
  mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

export const systemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches;
};

export const useTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return value;
};
