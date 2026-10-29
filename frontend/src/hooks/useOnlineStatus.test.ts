import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

const setOnLine = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
};

describe('useOnlineStatus', () => {
  afterEach(() => {
    setOnLine(true);
  });

  it('reads the current connection state', () => {
    setOnLine(true);
    expect(renderHook(() => useOnlineStatus()).result.current).toBe(true);

    setOnLine(false);
    expect(renderHook(() => useOnlineStatus()).result.current).toBe(false);
  });

  it('reacts to the online and offline events', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('removes its listeners when it unmounts', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    removeEventListener.mockRestore();
  });
});
