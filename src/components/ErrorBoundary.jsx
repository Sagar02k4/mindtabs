import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('MindTabs UI error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen gradient-bg text-surface-100 flex items-center justify-center p-6">
        <div role="alert" className="glass rounded-2xl p-6 max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">MindTabs needs to reload</h1>
          <p className="text-sm text-surface-400 mb-4">The page hit an unexpected error. Your saved data is still stored locally.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload MindTabs</button>
        </div>
      </main>
    );
  }
}
