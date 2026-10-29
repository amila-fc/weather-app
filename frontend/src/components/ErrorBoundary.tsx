import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Render prop so each boundary can supply its own copy and recovery actions. */
  fallback: (reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only: never log payloads or any user data.
    console.error('Unhandled render error:', error.name, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    return this.state.hasError ? this.props.fallback(this.reset) : this.props.children;
  }
}

interface ErrorFallbackProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onReload?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  title,
  message,
  onRetry,
  onReload,
}) => (
  <div className="error-fallback" role="alert">
    <h2 className="error-fallback__title">{title}</h2>
    <p className="error-fallback__message">{message}</p>
    <div className="error-fallback__actions">
      {onRetry && (
        <button type="button" className="error-fallback__retry" onClick={onRetry}>
          Try again
        </button>
      )}
      {onReload && (
        <button type="button" onClick={onReload}>
          Reload
        </button>
      )}
    </div>
  </div>
);
