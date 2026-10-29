import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../hooks/useTheme';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from '../components/ThemeToggle';

const media = vi.hoisted(() => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = { matches: false };
  return {
    state,
    listeners,
    emit(matches: boolean) {
      state.matches = matches;
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
  };
});

const stubMatchMedia = () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: media.state.matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        media.listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        media.listeners.delete(listener),
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })),
  );
};

const renderProvider = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe('ThemeProvider', () => {
  beforeEach(() => {
    media.state.matches = false;
    media.listeners.clear();
    stubMatchMedia();
    delete document.documentElement.dataset.theme;
  });

  it('applies the OS preference while in system mode', () => {
    media.state.matches = true;
    renderProvider();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('follows a live OS switch', () => {
    renderProvider();
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => media.emit(true));
    expect(document.documentElement.dataset.theme).toBe('dark');

    act(() => media.emit(false));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('persists an explicit choice and restores it on the next mount', async () => {
    const first = renderProvider();

    // system -> light -> dark
    await userEvent.click(screen.getByRole('button', { name: /switch to light theme/i }));
    await userEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    first.unmount();
    renderProvider();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('falls back to system when the stored value is corrupt', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');

    renderProvider();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });
});
