import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComparisonTab } from './components/ComparisonTab';
import { CurrentWeatherTab } from './components/CurrentWeatherTab';
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary';
import { NotificationBell } from './components/NotificationBell';
import { TabNav } from './components/TabNav';
import type { AppTab } from './components/TabNav';
import { ThemeToggle } from './components/ThemeToggle';
import { useComparisonLocations } from './hooks/useComparisonLocations';
import { useWeatherWatch } from './hooks/useWeatherWatch';
import { ActiveLocationProvider, useActiveLocation } from './state/ActiveLocationContext';
import type { Coordinates } from './api/weatherClient';
import { weatherApi } from './api/weatherClient';
import './App.css';

const tabFromHash = (): AppTab => (window.location.hash === '#compare' ? 'compare' : 'current');

const reloadPage = () => window.location.reload();

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>(tabFromHash);
  const comparison = useComparisonLocations();
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

  const selectTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.location.hash = tab === 'compare' ? '#compare' : '';
  };

  // A map pin popup hands its selected points straight to the comparison tab.
  const compareMapLocations = (locations: Coordinates[]) => {
    comparison.replaceAll(locations);
    selectTab('compare');
  };

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
          <NotificationBell
            onSelectAlert={(alert) => {
              setLocation(alert.coordinates);
              selectTab('current');
            }}
          />
        </div>
      </header>

      <nav className="app-nav" aria-label="Weather views">
        <TabNav activeTab={activeTab} onSelect={selectTab} />
      </nav>

      <p className="sr-only" role="status" aria-live="polite">
        {activeTab === 'current' ? 'Showing current weather' : 'Showing comparison'}
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
          {activeTab === 'current' ? (
            <CurrentWeatherTab onCompare={compareMapLocations} />
          ) : (
            <ComparisonTab comparison={comparison} />
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
