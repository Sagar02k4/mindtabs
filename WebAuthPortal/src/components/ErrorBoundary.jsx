import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('MindTabs portal error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div role="alert" className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold mb-2">MindTabs needs to reload</h1>
          <p className="text-sm text-gray-500 mb-6">Something unexpected happened. Your account data is not affected.</p>
          <button type="button" className="px-5 py-3 rounded-xl bg-primary text-white font-medium" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </main>
    );
  }
}
