import React from "react";

export class AppErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, {
  hasError: boolean;
  error?: Error;
}> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("App error boundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
          <div className="max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl shadow-black/40">
            <h1 className="text-2xl font-bold mb-4">Oops, something went wrong.</h1>
            <p className="text-sm text-slate-300 mb-6">
              The app encountered an unexpected error. Please refresh the page or try again later.
            </p>
            <button
              className="inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              onClick={() => window.location.reload()}
            >
              Refresh the page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
