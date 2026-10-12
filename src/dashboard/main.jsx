import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import '../index.css';
import ErrorBoundary from '../components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ErrorBoundary><Dashboard /></ErrorBoundary>
    </HashRouter>
  </React.StrictMode>
);
