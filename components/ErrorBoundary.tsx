import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔴 [ErrorBoundary] Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[10000] p-4 md:p-10 bg-black text-green-500 font-mono h-screen overflow-auto">
          <h1 className="text-2xl font-bold mb-4 border-b border-green-500 pb-2 animate-pulse">
            SYSTEM FAILURE [FATAL ERROR]
          </h1>
          <p className="mb-4 text-sm opacity-80">
            Произошел сбой визуализации. Данные для отладки представлены ниже.
          </p>
          
          <div className="bg-gray-900 p-4 rounded border border-red-500/50 mb-4 shadow-lg shadow-red-900/20">
            <h3 className="text-red-500 font-bold mb-2">ERROR MESSAGE:</h3>
            <p className="text-white font-bold">{this.state.error?.toString()}</p>
          </div>

          <div className="mb-6">
             <h3 className="text-gray-400 font-bold mb-2 text-xs uppercase">Stack Trace:</h3>
             <details className="bg-gray-900/50 p-4 rounded text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto border border-gray-800" open>
                {this.state.errorInfo?.componentStack || "No stack trace available"}
             </details>
          </div>

          <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 border border-green-500 bg-green-500/10 hover:bg-green-500 hover:text-black font-bold transition-all uppercase tracking-widest"
              >
                REBOOT SYSTEM (RELOAD)
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-6 py-3 border border-gray-500 hover:bg-gray-800 text-gray-400 hover:text-white font-bold transition-all uppercase tracking-widest"
              >
                IGNORE & TRY RENDER
              </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;