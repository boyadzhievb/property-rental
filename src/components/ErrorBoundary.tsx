import { Component, type ReactNode } from 'react';
import { useLocale } from '../context/LocaleContext';

/** Crash screen. A function component so it can read the current language. */
function ErrorFallback({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-lg font-semibold text-ios-text mb-2">{t.somethingWentWrong}</p>
      <p className="text-sm text-ios-text-secondary mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-ios-blue text-white rounded-lg text-sm font-medium focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t.tryAgain}
      </button>
    </div>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return <ErrorFallback message={this.state.error?.message} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}
