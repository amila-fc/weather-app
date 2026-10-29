import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, ErrorFallback } from './ErrorBoundary';

const Boom: React.FC<{ fail: boolean }> = ({ fail }) => {
  if (fail) {
    throw new Error('secret payload');
  }
  return <p>safe content</p>;
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the fallback instead of blanking the page and never leaks the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={() => <p role="alert">We couldn't show this view.</p>}>
        <Boom fail />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't show this view.");
    expect(screen.queryByText(/secret payload/)).not.toBeInTheDocument();
  });

  it('recovers through the reset callback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldFail = true;

    const Thrower = () => {
      if (shouldFail) {
        throw new Error('boom');
      }
      return <p>safe content</p>;
    };

    render(
      <ErrorBoundary
        fallback={(reset) => (
          <button
            type="button"
            onClick={() => {
              shouldFail = false;
              reset();
            }}
          >
            Try again
          </button>
        )}
      >
        <Thrower />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('only logs the error name to the console', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={() => <p>fallback</p>}>
        <Boom fail />
      </ErrorBoundary>,
    );

    const ours = consoleError.mock.calls.filter((call) => call[0] === 'Unhandled render error:');
    expect(ours).toHaveLength(1);
    expect(ours[0].join(' ')).toContain('Error');
    expect(ours[0].join(' ')).not.toContain('secret payload');
  });
});

describe('ErrorFallback', () => {
  it('renders an alert with retry and reload actions', async () => {
    const onRetry = vi.fn();
    const onReload = vi.fn();

    render(
      <ErrorFallback
        title="Something broke"
        message="Try again or reload."
        onRetry={onRetry}
        onReload={onReload}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something broke');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
