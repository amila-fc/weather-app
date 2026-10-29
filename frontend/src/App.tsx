import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CurrentWeatherTab } from './components/CurrentWeatherTab';
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary';
import { NotificationBell } from './components/NotificationBell';
import { OfflineBanner } from './components/OfflineBanner';
import { SkeletonBlock } from './components/Skeleton';
import { TabNav } from './components/TabNav';
import type { AppTab } from './components/TabNav';
import { ThemeToggle } from './components/ThemeToggle';
import { useComparisonLocations } from './hooks/useComparisonLocations';
import { useWeatherWatch } from './hooks/useWeatherWatch';
import { ActiveLocationProvider, useActiveLocation } from './state/ActiveLocationContext';
import type { Coordinates } from './api/weatherClient';
import { weatherApi } from './api/weatherClient';
import type { WeatherAlert } from './utils/alerts';
import './App.css';

// The dashboard pulls in the chart and dashboard widgets, so it is only downloaded when the tab is opened.
const TrendsTab = lazy(() =>
  import('./components/TrendsTab').then((module) => ({ default: module.TrendsTab })),
);

// The comparison view (picker, table, favorites) is not needed until the tab is opened either.
const ComparisonTab = lazy(() =>
  import('./components/ComparisonTab').then((module) => ({ default: module.ComparisonTab })),
);

const TabSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div aria-busy="true">
    <span className="sr-only">{label}</span>
    <SkeletonBlock width="40%" height="1.25rem" />
    <SkeletonBlock width="100%" height="160px" />
  </div>
);

const TAB_HASHES: Record<AppTab, string> = {
  current: '',
  trends: '#trends',
  compare: '#compare',
};

const tabFromHash = (): AppTab => {
  const match = (Object.keys(TAB_HASHES) as AppTab[]).find((tab) => TAB_HASHES[tab] === window.location.hash);
  return match ?? 'current';
};

const TAB_ANNOUNCEMENTS: Record<AppTab, string> = {
  current: 'Showing current weather',
  trends: 'Showing 24-hour trends',
  compare: 'Showing comparison',
};

const reloadPage = () => window.location.reload();

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>(tabFromHash);
  const comparison = useComparisonLocations();
  const replaceComparisonLocations = comparison.replaceAll;
  const { setLocation } = useActiveLocation();

  useWeatherWatch();

  // Keep the tab in the URL hash so a reload reopens the same view.
  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: weatherApi.getStatus,
  });

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    window.location.hash = TAB_HASHES[tab];
  }, []);

  // A map pin popup hands its selected points straight to the comparison tab.
  const compareMapLocations = useCallback(
    (locations: Coordinates[]) => {
      replaceComparisonLocations(locations);
      setActiveTab('compare');
      window.location.hash = TAB_HASHES.compare;
    },
    [replaceComparisonLocations],
  );

  const selectAlertLocation = useCallback(
    (alert: WeatherAlert) => {
      setLocation(alert.coordinates);
      selectTab('current');
    },
    [selectTab, setLocation],
  );

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="app-header">
        <div className="app-header__title">
          <h1>Weather App</h1>
          {status && <p className="server-status">Server Status: {status}</p>}
        </div>
        <div className="app-header__actions">
          <ThemeToggle />
          <NotificationBell onSelectAlert={selectAlertLocation} />
        </div>
      </header>

      <OfflineBanner />

      <nav className="app-nav" aria-label="Weather views">
        <TabNav activeTab={activeTab} onSelect={selectTab} />
      </nav>

      <p className="sr-only" role="status" aria-live="polite">
        {TAB_ANNOUNCEMENTS[activeTab]}
      </p>

      <main className="app-main" id="main" tabIndex={-1}>
        <ErrorBoundary
          key={activeTab}
          fallback={(reset) => (
            <ErrorFallback
              title="We couldn't show this view."
              message="Something went wrong while rendering this view. Try again, or reload the page."
              onRetry={reset}
              onReload={reloadPage}
            />
          )}
        >
          {activeTab === 'current' && <CurrentWeatherTab onCompare={compareMapLocations} />}
          {activeTab === 'trends' && (
            <Suspense fallback={<TabSkeleton label="Loading the trends dashboard…" />}>
              <TrendsTab />
            </Suspense>
          )}
          {activeTab === 'compare' && (
            <Suspense fallback={<TabSkeleton label="Loading the comparison view…" />}>
              <ComparisonTab comparison={comparison} />
            </Suspense>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  return (
    <ActiveLocationProvider>
      <AppContent />
    </ActiveLocationProvider>
  );
}

export default App;
