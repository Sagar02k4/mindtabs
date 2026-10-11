import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function App() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" aria-label="Loading MindTabs" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Suspense>
  );
}

export default App;
