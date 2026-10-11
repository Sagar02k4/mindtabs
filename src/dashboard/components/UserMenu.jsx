import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, RefreshCw, Cloud, CloudOff, Trash2, ChevronDown } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { fullSync, getLastSyncTime } from '../../utils/syncService';
import { timeAgo } from '../../utils/helpers';

export default function UserMenu() {
  const { user, isAuthenticated, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    // Load last sync time
    getLastSyncTime().then(setLastSync);
  }, [syncing]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMessage('Syncing…');
    try {
      const result = await fullSync(user.id);
      setSyncMessage(result.success ? 'Sync completed.' : (result.error || 'Sync failed. Local data is safe.'));
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed. Local data is safe.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  if (!isAuthenticated) return null;

  const userEmail = user?.email || 'User';
  const avatar = user?.user_metadata?.avatar_url;
  const initials = userEmail.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Account menu for ${userEmail}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card transition-all duration-200"
      >
        {/* Avatar */}
        {avatar ? (
          <img src={avatar} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan
                        flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
        )}

        {/* Sync indicator */}
        <div className="flex items-center gap-1">
          {syncing ? (
            <RefreshCw size={12} className="text-primary-400 animate-spin" />
          ) : (
            <Cloud size={12} className="text-emerald-400" />
          )}
        </div>

        <ChevronDown size={12} className={`text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 glass rounded-xl p-2 min-w-[220px]
                      animate-scale-in shadow-xl shadow-black/40">
          {/* User info */}
          <div className="px-3 py-2 mb-1 border-b border-surface-700/50">
            <p className="text-sm font-medium text-surface-200 truncate">{userEmail}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {lastSync ? (
                <>
                  <Cloud size={10} className="text-emerald-400" />
                  <span className="text-[10px] text-surface-400">Synced {timeAgo(lastSync)}</span>
                </>
              ) : (
                <>
                  <CloudOff size={10} className="text-surface-500" />
                  <span className="text-[10px] text-surface-500">Not synced yet</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleSync}
            disabled={syncing}
            aria-busy={syncing}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                      hover:bg-surface-700/50 text-surface-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>

          {syncMessage && <p role="status" className="px-3 py-2 text-[11px] text-surface-400">{syncMessage}</p>}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                      hover:bg-red-500/10 text-surface-300 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
