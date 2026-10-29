import { useSyncExternalStore } from 'react';

const subscribe = (onStoreChange: () => void): (() => void) => {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
};

const getSnapshot = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

const getServerSnapshot = (): boolean => true;

/** `navigator.onLine` plus the `online`/`offline` events, so the UI reacts without polling. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
