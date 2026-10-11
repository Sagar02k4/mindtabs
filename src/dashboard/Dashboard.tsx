import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sparkles, Trash2, RefreshCw, AlertCircle, Download, Upload, FolderOpen, Bell, Settings } from 'lucide-react';
import useTabStore from '../store/tabStore';
import useAuthStore from '../store/authStore';
import { isSupabaseConfigured } from '../utils/supabase';
import { fullSync } from '../utils/syncService';
import { getSettings, saveSettings, getWorkspaces } from '../utils/storage';
import { normalizeSettings } from '../utils/settings';
import { encryptBackup, decryptBackup, parseCsvBackup, escapeCsvCell } from '../utils/helpers';
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
  const { tabs, reminders, lastDeleted, undoLastDelete, loading: tabsLoading, init, getFilteredTabs, deleteAllData, searchQuery, activeTag, actionError, clearActionError } = useTabStore();
  const { isAuthenticated, user, loading: authLoading, restoreSession } = useAuthStore();
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [page, setPage] = useState(1);
  const [syncMessage, setSyncMessage] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ theme: 'dark', tracking: false, notifications: true, onboardingComplete: false, retentionDays: 90, syncIntervalMinutes: 5, blockedDomains: [] as string[] });
  const [workspaces, setWorkspaces] = useState<any[]>([]);
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
      setWorkspaces(await getWorkspaces());
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
  useEffect(() => {
    // A selection belongs to the current result set. Keeping hidden selections
    // after filtering makes bulk actions and exports unexpectedly affect tabs
    // the user can no longer see.
    setPage(1);
    setSelected(new Set());
  }, [searchQuery, activeTag]);
  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount]);
  useEffect(() => {
    const validIds = new Set(tabs.map(tab => tab.id));
    setSelected(current => new Set([...current].filter(id => validIds.has(id))));
  }, [tabs]);

  const handleRefresh = async () => {
    if (isAuthenticated && user) {
      const result = await fullSync(user.id);
      setSyncMessage(result.success ? 'Synced successfully.' : (result.error || 'Sync failed. Your local data is safe.'));
    }
    await init();
  };

  const loading = tabsLoading || authLoading;

  const toggleSelected = (id) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const exportData = async (csv = false, encrypted = false) => {
    const rows = tabs.filter(t => selected.size === 0 || selected.has(t.id));
    const backup = { version: 1, exportedAt: new Date().toISOString(), tabs: rows, reminders: useTabStore.getState().reminders };
    if (encrypted) { const password = window.prompt('Choose a backup password (minimum 8 characters).'); if (!password) return; if (password.length < 8) { setSyncMessage('Encrypted backup passwords must be at least 8 characters.'); return; } const envelope = await encryptBackup(backup, password); const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mindtabs-encrypted-backup.json'; a.click(); URL.revokeObjectURL(a.href); return; }
    const content = csv
      ? ['title,url,tag,archived', ...rows.map(t => [t.title, t.url, t.tag || '', t.isArchived ? 'yes' : 'no'].map(escapeCsvCell).join(','))].join('\n')
      : JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: csv ? 'text/csv' : 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mindtabs-backup.${csv ? 'csv' : 'json'}`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setSyncMessage('Backup is too large (maximum 10 MB).'); return; } if (!window.confirm('Import this backup and merge it with your current data?')) return; const reader = new FileReader(); reader.onload = async () => { try { const text = String(reader.result); let parsed = file.name.toLowerCase().endsWith('.csv') ? parseCsvBackup(text) : JSON.parse(text); if (parsed.format === 'mindtabs-encrypted-backup') { const password = window.prompt('Enter the backup password.'); if (!password) return; parsed = await decryptBackup(parsed, password); } await useTabStore.getState().importData(parsed); setSyncMessage('Backup imported and merged successfully.'); } catch (e) { setSyncMessage(e instanceof Error ? e.message : 'Could not import backup.'); } }; reader.readAsText(file); event.target.value = ''; };
  const updateSettings = async (next) => {
    const previous = settings;
    const merged = normalizeSettings({ ...previous, ...next });
    setSettings(merged);
    try {
      await saveSettings(merged);
      const browser = (globalThis as any).chrome;
      if (browser?.alarms) {
        if (next.syncIntervalMinutes) await browser.alarms.create('sync-alarm', { periodInMinutes: merged.syncIntervalMinutes });
        if (next.retentionDays) await browser.alarms.create('weekly-cleanup', { periodInMinutes: 7 * 24 * 60 });
      }
      setSyncMessage('Settings saved.');
    } catch (error) {
      setSettings(previous);
      setSyncMessage(error instanceof Error ? `Could not save settings: ${error.message}` : 'Could not save settings.');
    }
  };
  const completeOnboarding = async (tracking) => { await updateSettings({ tracking, onboardingComplete: true }); };
  const openSelected = () => tabs.filter(t => selected.has(t.id)).forEach(t => { const browser = (globalThis as any).chrome; if (browser?.tabs) browser.tabs.create({ url: t.url }); else window.open(t.url, '_blank', 'noopener,noreferrer'); });
  const saveWorkspace = async () => { if (!selected.size) { setSyncMessage('Select tabs before saving a workspace.'); return; } const name = window.prompt('Workspace name'); if (name) { const workspace = await useTabStore.getState().saveWorkspace(name, [...selected]); setWorkspaces(current => [...current, workspace]); setSyncMessage(`Workspace “${workspace.name}” saved.`); } };
  const restoreWorkspace = (workspace) => { const ids = new Set(workspace.tabIds); const existingTabs = tabs.filter(tab => ids.has(tab.id)); setSelected(new Set(existingTabs.map(tab => tab.id))); existingTabs.forEach(tab => { const browser = (globalThis as any).chrome; if (browser?.tabs) browser.tabs.create({ url: tab.url }); else window.open(tab.url, '_blank', 'noopener,noreferrer'); }); setSyncMessage(existingTabs.length ? `Opened workspace “${workspace.name}”.` : 'No tabs from this workspace are available.'); };



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

  if (!settings.onboardingComplete) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"><div className="glass rounded-2xl p-8 max-w-lg shadow-2xl"><p className="section-kicker mb-3">Welcome to MindTabs</p><h1 className="text-2xl font-bold mb-3">Save the reason behind your tabs.</h1><p className="text-sm text-muted-foreground leading-6 mb-4">MindTabs can save page titles and URLs locally and, when you sign in, sync that metadata to your Supabase account. You can pause tracking, block domains, export encrypted backups, or delete everything at any time.</p><p className="text-sm text-muted-foreground leading-6 mb-6">Do you want to enable automatic tab tracking?</p><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => completeOnboarding(true)}>Enable tracking</button><button className="btn-secondary" onClick={() => completeOnboarding(false)}>Keep tracking paused</button></div></div></div>;
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${settings.theme === 'dark' ? 'dark' : ''}`}>
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
        {lastDeleted && <div className="max-w-7xl mx-auto px-6 pt-3"><div role="status" className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"><span>“{lastDeleted.tab.title}” deleted.</span><button className="btn-secondary" onClick={undoLastDelete}>Undo</button></div></div>}
        <HeroDashboardWrapper 
          onRefresh={handleRefresh} 
          onClearAll={() => setShowDeleteAll(true)}
          tabsCount={tabs.length}
        >
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button className="btn-secondary" onClick={() => { const ids = visibleTabs.map(t => t.id); setSelected(new Set(ids)); }}><FolderOpen size={14} /> Select page</button>
              {selected.size > 0 && <><button className="btn-secondary" onClick={openSelected}>Open selected</button><button className="btn-secondary" onClick={saveWorkspace}>Save workspace</button><button className="btn-secondary" onClick={() => useTabStore.getState().bulkUpdate([...selected], 'archive')}>Archive selected</button><button className="btn-secondary" onClick={() => useTabStore.getState().bulkUpdate([...selected], 'unarchive')}>Unarchive selected</button><button className="btn-secondary" onClick={() => setSelected(new Set())}>Clear selection</button></>}
              <button className="btn-secondary" onClick={() => exportData(false)}><Download size={14} /> Export JSON</button>
              <button className="btn-secondary" onClick={() => exportData(false, true)}>Encrypted backup</button>
              <button className="btn-secondary" onClick={() => exportData(true)}>Export CSV</button>
              <label className="btn-secondary cursor-pointer"><Upload size={14} /> Import backup<input type="file" accept="application/json,.csv,text/csv" className="hidden" onChange={importData} /></label>
              <button className="btn-secondary" onClick={() => setShowSettings(!showSettings)}><Settings size={14} /> Settings</button>
              {workspaces.length > 0 && <select className="btn-secondary" aria-label="Open saved workspace" defaultValue="" onChange={e => { const workspace = workspaces.find(item => item.id === e.target.value); if (workspace) restoreWorkspace(workspace); e.target.value = ''; }}><option value="">Workspaces</option>{workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>}
            </div>
            {showSettings && <div className="glass rounded-xl p-4 mb-6 grid gap-3 md:grid-cols-4 text-sm">
              <label>Theme <select className="input-field ml-2" value={settings.theme} onChange={e => updateSettings({ theme: e.target.value })}><option value="dark">Dark</option><option value="light">Light</option></select></label>
              <label><input type="checkbox" checked={settings.tracking} onChange={e => updateSettings({ tracking: e.target.checked })} /> Track tabs</label>
              <label><input type="checkbox" checked={settings.notifications} onChange={e => updateSettings({ notifications: e.target.checked })} /> Notifications</label>
              <label>Retention days <input className="input-field w-20 ml-2" type="number" min="7" value={settings.retentionDays} onChange={e => updateSettings({ retentionDays: Number(e.target.value) })} /></label>
              <label>Sync minutes <input className="input-field w-20 ml-2" type="number" min="1" value={settings.syncIntervalMinutes} onChange={e => updateSettings({ syncIntervalMinutes: Number(e.target.value) })} /></label>
              <label className="md:col-span-4">Never track domains <input className="input-field w-full mt-1" value={settings.blockedDomains.join(', ')} onChange={e => updateSettings({ blockedDomains: e.target.value.split(',').map(value => value.trim()).filter(Boolean) })} placeholder="bank.example, mail.example" /></label>
            </div>}
            {reminders.filter(r => r.status === 'pending').length > 0 && <div className="glass rounded-xl p-4 mb-6" aria-live="polite"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bell size={15} /> Upcoming reminders</h3><div className="grid gap-2 md:grid-cols-2">{reminders.filter(r => r.status === 'pending').sort((a,b) => a.remindAt-b.remindAt).map(r => { const tab = tabs.find(t => t.id === r.tabId); return <div key={r.id} className="text-xs text-muted-foreground flex justify-between"><span className="truncate">{tab?.title || 'Saved page'}</span><span>{new Date(r.remindAt).toLocaleString()}</span></div>; })}</div></div>}
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
                          <button type="button" className="btn-secondary" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                          <span className="text-xs text-muted-foreground" aria-current="page">Page {page} of {pageCount}</span>
                          <button type="button" className="btn-secondary" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
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
                <button onClick={() => window.open("https://github.com/Sagar02k4/MindTabs", "_blank", "noopener,noreferrer")} className="hover:text-foreground">GitHub</button>
                <button onClick={() => window.open("https://github.com/Sagar02k4/MindTabs/issues", "_blank", "noopener,noreferrer")} className="hover:text-foreground">Support</button>
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
