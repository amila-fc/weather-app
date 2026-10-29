import '@testing-library/jest-dom/vitest';
import { expect, afterEach, vi } from 'vitest';
// vitest-axe's root `matchers` entry is type-only, so the runtime matcher comes from its dist entry.
import { toHaveNoViolations } from 'vitest-axe/dist/matchers';

expect.extend({ toHaveNoViolations });

// Favorites and notification preferences live in localStorage, so every test starts from a clean storage.
// Stubbed globals (Notification) and fake timers are per-test, so they are reset here too.
afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
