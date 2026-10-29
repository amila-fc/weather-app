import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OfflineBanner } from './OfflineBanner';

const setOnLine = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
};

const goOffline = () => {
  act(() => {
    setOnLine(false);
    window.dispatchEvent(new Event('offline'));
  });
};

describe('OfflineBanner', () => {
  afterEach(() => {
    setOnLine(true);
  });

  it('renders nothing while the browser is online', () => {
    setOnLine(true);

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('announces the offline state politely, without blocking the page', () => {
    setOnLine(false);

    render(<OfflineBanner />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/offline — showing saved weather/i);
    expect(banner).toHaveClass('offline-banner');
  });

  it('appears when the connection drops and disappears when it returns', () => {
    setOnLine(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    goOffline();
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
