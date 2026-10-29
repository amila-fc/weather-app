import { nextThemeMode, useTheme } from '../hooks/useTheme';

const MODE_LABELS = {
  light: 'Switch to light theme',
  dark: 'Switch to dark theme',
  system: 'Switch to system theme',
} as const;

export const ThemeToggle: React.FC = () => {
  const { mode, resolvedTheme, setMode } = useTheme();
  const next = nextThemeMode(mode);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={MODE_LABELS[next]}
      aria-pressed={resolvedTheme === 'dark'}
      title={`Theme: ${mode}`}
      onClick={() => setMode(next)}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {resolvedTheme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="sr-only">Current theme: {mode}</span>
    </button>
  );
};
