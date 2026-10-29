import { useOnlineStatus } from '../hooks/useOnlineStatus';

/** Polite, non-blocking notice: the app keeps working from cached data while the connection is down. */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-banner" role="status">
      <span aria-hidden="true">📴</span> You&apos;re offline — showing saved weather.
    </div>
  );
};
