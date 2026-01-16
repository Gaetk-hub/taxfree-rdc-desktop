import { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oups ! Une erreur est survenue
              </h1>
              <p className="text-gray-500 mb-6">
                Nous sommes désolés, quelque chose s'est mal passé. Veuillez réessayer.
              </p>

              {/* Error Details (collapsible) */}
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  Détails techniques
                </summary>
                <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-600 overflow-auto max-h-40">
                  <p className="font-semibold text-red-600 mb-2">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  {this.state.error?.stack && (
                    <pre className="whitespace-pre-wrap break-words text-gray-500">
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <pre className="whitespace-pre-wrap break-words text-gray-400 mt-2 pt-2 border-t border-gray-200">
                      {this.state.errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  )}
                </div>
              </details>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Réessayer
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <HomeIcon className="w-5 h-5" />
                  Accueil
                </button>
              </div>

              {/* Reload hint */}
              <p className="mt-4 text-xs text-gray-400">
                Si le problème persiste,{' '}
                <button 
                  onClick={this.handleReload}
                  className="text-blue-500 hover:underline"
                >
                  rechargez la page
                </button>
              </p>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 mt-4">
              Tax Free RDC • Support: support@taxfree.cd
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
