import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sparkles, Trash2, RefreshCw, AlertCircle, Download, Upload, FolderOpen, Bell, Settings } from 'lucide-react';
import useTabStore from '../store/tabStore';
import useAuthStore from '../store/authStore';
import { isSupabaseConfigured } from '../utils/supabase';
import { fullSync } from '../utils/syncService';
import { getSettings, saveSettings } from '../utils/storage';
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
  const { tabs, reminders, loading: tabsLoading, init, getFilteredTabs, deleteAllData, searchQuery, activeTag, actionError, clearActionError } = useTabStore();
  const { isAuthenticated, user, loading: authLoading, restoreSession } = useAuthStore();
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [page, setPage] = useState(1);
  const [syncMessage, setSyncMessage] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ tracking: true, notifications: true, retentionDays: 90, syncIntervalMinutes: 5, blockedDomains: [] as string[] });
  const pageSize = 20;
  const filteredTabs = getFilteredTabs();
  const pageCount = Math.max(1, Math.ceil(filteredTabs.length / pageSize));
  const visibleTabs = filteredTabs.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const bootstrap = async () => {
      if (isSupabaseConfigured()) {
        await restoreSession();
      }
      await init();
      setSettings(await getSettings());
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fullSync(user.id).then((result) => {
        if (!result.success) setSyncMessage(result.error || 'Sync failed. Your local data is safe.');
        else setSyncMessage('');
        return init();
      });
      setShowAuth(false);
    }
  }, [isAuthenticated]);
  useEffect(() => setPage(1), [searchQuery, activeTag]);

  const handleRefresh = async () => {
    if (isAuthenticated && user) {
      const result = await fullSync(user.id);
      setSyncMessage(result.success ? 'Synced successfully.' : (result.error || 'Sync failed. Your local data is safe.'));
    }
    await init();
  };

  const loading = tabsLoading || authLoading;

  const toggleSelected = (id) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const exportData = (csv = false) => {
    const rows = tabs.filter(t => selected.size === 0 || selected.has(t.id));
    const content = csv
      ? ['title,url,tag,archived', ...rows.map(t => [t.title, t.url, t.tag || '', t.isArchived ? 'yes' : 'no'].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
      : JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tabs: rows, reminders: useTabStore.getState().reminders }, null, 2);
    const blob = new Blob([content], { type: csv ? 'text/csv' : 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mindtabs-backup.${csv ? 'csv' : 'json'}`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setSyncMessage('Backup is too large (maximum 10 MB).'); return; } if (!window.confirm('Import this backup and merge it with your current data?')) return; const reader = new FileReader(); reader.onload = async () => { try { await useTabStore.getState().importData(JSON.parse(String(reader.result))); setSyncMessage('Backup imported and merged successfully.'); } catch (e) { setSyncMessage(e instanceof Error ? e.message : 'Could not import backup.'); } }; reader.readAsText(file); event.target.value = ''; };
  const updateSettings = async (next) => { const merged = { ...settings, ...next }; setSettings(merged); await saveSettings(merged); const browser = (globalThis as any).chrome; if (browser?.alarms) { if (next.syncIntervalMinutes) browser.alarms.create('sync-alarm', { periodInMinutes: Math.max(1, Number(merged.syncIntervalMinutes)) }); if (next.retentionDays) browser.alarms.create('weekly-cleanup', { periodInMinutes: 7 * 24 * 60 }); } setSyncMessage('Settings saved.'); };
  const openSelected = () => tabs.filter(t => selected.has(t.id)).forEach(t => { const browser = (globalThis as any).chrome; if (browser?.tabs) browser.tabs.create({ url: t.url }); else window.open(t.url, '_blank'); });
  const saveWorkspace = async () => { if (!selected.size) { setSyncMessage('Select tabs before saving a workspace.'); return; } const name = window.prompt('Workspace name'); if (name) { await useTabStore.getState().saveWorkspace(name, [...selected]); setSyncMessage(`Workspace “${name}” saved.`); } };



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
        {syncMessage && (
          <div className="max-w-7xl mx-auto px-6 pt-3">
            <div role="status" className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">{syncMessage}</div>
          </div>
        )}
        <HeroDashboardWrapper 
          onRefresh={handleRefresh} 
          onClearAll={() => setShowDeleteAll(true)}
          tabsCount={tabs.length}
        >
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button className="btn-secondary" onClick={() => { const ids = visibleTabs.map(t => t.id); setSelected(new Set(ids)); }}><FolderOpen size={14} /> Select page</button>
              {selected.size > 0 && <><button className="btn-secondary" onClick={openSelected}>Open selected</button><button className="btn-secondary" onClick={saveWorkspace}>Save workspace</button><button className="btn-secondary" onClick={() => useTabStore.getState().bulkUpdate([...selected], 'archive')}>Archive selected</button><button className="btn-secondary" onClick={() => useTabStore.getState().bulkUpdate([...selected], 'unarchive')}>Unarchive selected</button><button className="btn-secondary" onClick={() => setSelected(new Set())}>Clear selection</button></>}
              <button className="btn-secondary" onClick={() => exportData(false)}><Download size={14} /> Export JSON</button>
              <button className="btn-secondary" onClick={() => exportData(true)}>Export CSV</button>
              <label className="btn-secondary cursor-pointer"><Upload size={14} /> Import JSON<input type="file" accept="application/json" className="hidden" onChange={importData} /></label>
              <button className="btn-secondary" onClick={() => setShowSettings(!showSettings)}><Settings size={14} /> Settings</button>
            </div>
            {showSettings && <div className="glass rounded-xl p-4 mb-6 grid gap-3 md:grid-cols-4 text-sm">
              <label><input type="checkbox" checked={settings.tracking} onChange={e => updateSettings({ tracking: e.target.checked })} /> Track tabs</label>
              <label><input type="checkbox" checked={settings.notifications} onChange={e => updateSettings({ notifications: e.target.checked })} /> Notifications</label>
              <label>Retention days <input className="input-field w-20 ml-2" type="number" min="7" value={settings.retentionDays} onChange={e => updateSettings({ retentionDays: Number(e.target.value) })} /></label>
              <label>Sync minutes <input className="input-field w-20 ml-2" type="number" min="1" value={settings.syncIntervalMinutes} onChange={e => updateSettings({ syncIntervalMinutes: Number(e.target.value) })} /></label>
              <label className="md:col-span-4">Never track domains <input className="input-field w-full mt-1" value={settings.blockedDomains.join(', ')} onChange={e => updateSettings({ blockedDomains: e.target.value.split(',').map(value => value.trim()).filter(Boolean) })} placeholder="bank.example, mail.example" /></label>
            </div>}
            {reminders.filter(r => r.status === 'pending').length > 0 && <div className="glass rounded-xl p-4 mb-6"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bell size={15} /> Upcoming reminders</h3><div className="grid gap-2 md:grid-cols-2">{reminders.filter(r => r.status === 'pending').sort((a,b) => a.remindAt-b.remindAt).map(r => { const tab = tabs.find(t => t.id === r.tabId); return <div key={r.id} className="text-xs text-muted-foreground flex justify-between"><span className="truncate">{tab?.title || 'Saved page'}</span><span>{new Date(r.remindAt).toLocaleString()}</span></div>; })}</div></div>}
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
                        {visibleTabs.map((tab, index) => (
                            <div key={tab.id} className="flex gap-2 items-start"><input aria-label={`Select ${tab.title}`} type="checkbox" checked={selected.has(tab.id)} onChange={() => toggleSelected(tab.id)} className="mt-6" /><div className="flex-1"><TabCard tab={tab} index={index} /></div></div>
                        ))}
                      </div>
                      {pageCount > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-6">
                          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                          <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
                          <button className="btn-secondary" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
                        </div>
                      )}
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
