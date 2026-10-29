import '@testing-library/jest-dom/vitest';
import { expect, afterEach, vi } from 'vitest';
// vitest-axe's root `matchers` entry is type-only, so the runtime matcher comes from its dist entry.
import { toHaveNoViolations } from 'vitest-axe/dist/matchers';
import { resetRenderCounts } from '../utils/renderCount';

expect.extend({ toHaveNoViolations });

// jsdom ships no ResizeObserver, and the virtualizer only needs the callback plumbing to run.
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Favorites and notification preferences live in localStorage, so every test starts from a clean storage.
// Stubbed globals (Notification) and fake timers are per-test, so they are reset here too.
afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetRenderCounts();
});
