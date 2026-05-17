import React from "react";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-white font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-white/40 text-sm mb-6">This page encountered an error. Please refresh to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#5E6AD2] text-black font-bold px-6 py-2 rounded-xl hover:bg-[#5E6AD2] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
