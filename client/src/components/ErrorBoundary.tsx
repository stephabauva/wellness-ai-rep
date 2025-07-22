import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui/button';

interface Props {
  children?: ReactNode;
  fallbackComponent?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error for debugging (keep minimal for production)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorBoundary ${this.props.componentName || 'Unknown'}] Error caught:`, error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 m-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300">
              Something went wrong
            </h2>
          </div>
          
          <p className="text-red-600 dark:text-red-400 text-center mb-6 max-w-md">
            {this.props.componentName ? `The ${this.props.componentName} component` : 'This component'} 
            {' '}encountered an error and couldn't render properly.
          </p>
          
          <div className="flex gap-3">
            <Button onClick={this.handleRetry} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="bg-red-100 dark:bg-red-900/40 p-4 rounded text-xs overflow-auto text-red-800 dark:text-red-200">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;