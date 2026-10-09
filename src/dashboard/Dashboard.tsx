import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sparkles, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import useTabStore from '../store/tabStore';
import useAuthStore from '../store/authStore';
import { isSupabaseConfigured } from '../utils/supabase';
import { fullSync } from '../utils/syncService';
import SearchBar from './components/SearchBar';
import FilterSidebar from './components/FilterSidebar';
import StatsCards from './components/StatsCards';
import TabCard from './components/TabCard';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import EmptyState from '../components/EmptyState';
import { Header } from '@/components/ui/header-3';
import { HeroDashboardWrapper } from '@/components/ui/hero-3';
import AuthPage from './components/AuthPage';

function DashboardContent() {
  const navigate = useNavigate();
  const { tabs, loading: tabsLoading, init, getFilteredTabs, deleteAllData, searchQuery, actionError, clearActionError } = useTabStore();
  const { isAuthenticated, user, loading: authLoading, restoreSession } = useAuthStore();
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const filteredTabs = getFilteredTabs();

  useEffect(() => {
    const bootstrap = async () => {
      if (isSupabaseConfigured()) {
        await restoreSession();
      }
      await init();
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fullSync(user.id).then(() => init());
      setShowAuth(false);
    }
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    if (isAuthenticated && user) {
      await fullSync(user.id);
    }
    await init();
  };

  const loading = tabsLoading || authLoading;



  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center animate-pulse-soft">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-cyan 
                        flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
            <Sparkles size={28} className="text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading MindTabs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <Header onSignIn={() => navigate('/login')} />

      <main className="grow pb-16">
        {actionError && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              <span>{actionError}</span>
              <button onClick={clearActionError} className="rounded-lg px-2 py-1 text-amber-100 hover:bg-amber-400/10" aria-label="Dismiss message">Dismiss</button>
            </div>
          </div>
        )}
        <HeroDashboardWrapper 
          onRefresh={handleRefresh} 
          onClearAll={() => setShowDeleteAll(true)}
          tabsCount={tabs.length}
        >
            <div className="mb-6">
              <StatsCards />
            </div>

            <div className="mb-6">
              <SearchBar />
            </div>

            <div className="flex gap-6 relative z-20">
              <FilterSidebar />

              <div className="flex-1 min-w-0">
                  {filteredTabs.length === 0 ? (
                  searchQuery ? (
                      <EmptyState 
                        title="No matching tabs"
                        description={`No tabs found for "${searchQuery}". Try a different search term.`}
                        icon={AlertCircle}
                      />
                  ) : (
                      <EmptyState />
                  )
                  ) : (
                  <>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-muted-foreground">
                            Showing <span className="text-foreground font-medium">{filteredTabs.length}</span> tab{filteredTabs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {filteredTabs.map((tab, index) => (
                            <TabCard key={tab.id} tab={tab} index={index} />
                        ))}
                      </div>
                  </>
                  )}
              </div>
            </div>
        </HeroDashboardWrapper>
      </main>

      <footer className="w-full border-t border-border py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MindTabs</p>
            <div className="flex gap-4">
                <button onClick={() => window.open("https://github.com/Sagar02k4/MindTabs", "_blank")} className="hover:text-foreground">GitHub</button>
                <button onClick={() => window.open("https://github.com/Sagar02k4/MindTabs/issues", "_blank")} className="hover:text-foreground">Support</button>
            </div>
        </div>
      </footer>

      <DeleteConfirmModal
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={() => {
          deleteAllData();
          setShowDeleteAll(false);
        }}
        title="Delete All Data"
        message="This will permanently delete all tracked tabs, tags, and reminders. This action cannot be undone."
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Routes>
      <Route path="/" element={<DashboardContent />} />
      <Route path="/login" element={<AuthPage />} />
    </Routes>
  );
}
