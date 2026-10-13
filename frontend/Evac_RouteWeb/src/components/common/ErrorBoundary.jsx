import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log crash details for diagnostics
    console.error('EvacRoute UI Crash Intercepted by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReset,
        });
      }

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 shadow-sm">
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 leading-relaxed">
              An unexpected error interrupted this section of the command portal. Your session remains secure.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl text-left">
                <p className="text-xs font-mono text-red-700 dark:text-red-300 break-words font-semibold">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
              <a
                href="/admin/dashboard"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition"
              >
                <Home size={14} />
                Dashboard
              </a>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-slate-500">
              <ShieldAlert size={12} />
              <span>EvacRoute System Fault Protection</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
