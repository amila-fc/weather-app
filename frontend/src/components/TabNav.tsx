import { useRef } from 'react';

export type AppTab = 'current' | 'trends' | 'compare';

interface TabNavProps {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
}

const TABS: Array<{ id: AppTab; label: string }> = [
  { id: 'current', label: 'Current weather' },
  { id: 'trends', label: 'Trends' },
  { id: 'compare', label: 'Compare' },
];

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onSelect }) => {
  const tabRefs = useRef<Partial<Record<AppTab, HTMLButtonElement | null>>>({});

  // WAI-ARIA tabs pattern: arrow keys move selection *and* focus, Home/End jump to the ends.
  const focusTab = (index: number) => {
    const next = TABS[(index + TABS.length) % TABS.length];
    onSelect(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab(activeIndex + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab(activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(TABS.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="tab-nav" role="tablist" aria-label="Weather views">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          ref={(element) => {
            tabRefs.current[tab.id] = element;
          }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`tab-nav__tab${activeTab === tab.id ? ' tab-nav__tab--active' : ''}`}
          onClick={() => onSelect(tab.id)}
          onKeyDown={onKeyDown}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
