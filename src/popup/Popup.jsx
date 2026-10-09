import React, { useEffect, useState } from 'react';
import { 
  BookmarkPlus, Tag, Clock, LayoutDashboard, Trash2, AlertCircle,
  ExternalLink, Bell, Check, Sparkles, ChevronDown, Cloud, User 
} from 'lucide-react';
import useTabStore from '../store/tabStore';
import useAuthStore from '../store/authStore';
import { isSupabaseConfigured } from '../utils/supabase';
import TagBadge from '../components/TagBadge';
import Button from '../components/Button';
import { TAG_OPTIONS, REMINDER_PRESETS } from '../utils/constants';
import { extractDomain, timeAgo, getFaviconUrl } from '../utils/helpers';

export default function Popup() {
  const [currentTab, setCurrentTab] = useState(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [customDateTime, setCustomDateTime] = useState('');
  const [recentTabs, setRecentTabs] = useState([]);
  const { tabs, reminders, init, addTab, updateTag, setReminder, removeTab, getStats, actionError, clearActionError } = useTabStore();

  const { isAuthenticated, user, restoreSession } = useAuthStore();

  useEffect(() => {
    const bootstrap = async () => {
      if (isSupabaseConfigured()) {
        await restoreSession();
      }
      await init();
    };
    bootstrap();
    // Get the current active tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (chrTabs) => {
        if (chrTabs[0]) {
          setCurrentTab(chrTabs[0]);
        }
      });
    }
  }, []);

  useEffect(() => {
    // Show 5 most recent tabs
    const sorted = [...tabs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    setRecentTabs(sorted);
  }, [tabs]);

  const currentTrackedTab = currentTab ? tabs.find(t => t.url === currentTab.url) : null;
  const stats = getStats();

  const handleTagSelect = async (tagId) => {
    if (currentTrackedTab) {
      await updateTag(currentTrackedTab.id, tagId);
    } else if (currentTab) {
      const newTab = await addTab({
        title: currentTab.title,
        url: currentTab.url,
        favicon: currentTab.favIconUrl,
      });
      if (newTab) {
        await updateTag(newTab.id, tagId);
      }
    }
    setShowTagMenu(false);
  };

  const handleSetReminder = async (preset) => {
    if (preset.id === 'custom') {
      // Don't close the menu, show the datetime picker
      return;
    }
    const tabToRemind = currentTrackedTab || (currentTab ? await addTab({
      title: currentTab.title,
      url: currentTab.url,
      favicon: currentTab.favIconUrl,
    }) : null);
    
    if (tabToRemind) {
      await setReminder(tabToRemind.id, preset.getTime());
    }
    setShowReminderMenu(false);
  };

  const handleCustomReminder = async () => {
    if (!customDateTime) return;
    const time = new Date(customDateTime).getTime();
    if (time <= Date.now()) return;
    
    const tabToRemind = currentTrackedTab || (currentTab ? await addTab({
      title: currentTab.title,
      url: currentTab.url,
      favicon: currentTab.favIconUrl,
    }) : null);
    
    if (tabToRemind) {
      await setReminder(tabToRemind.id, time);
    }
    setShowReminderMenu(false);
    setCustomDateTime('');
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.openOptionsPage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[520px]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        {actionError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button onClick={clearActionError} className="text-amber-100 underline">Dismiss</button>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-cyan 
                          flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold gradient-text">MindTabs</h1>
          </div>
          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <div className="p-2" title={`Synced as ${user?.email}`}>
                <Cloud size={14} className="text-emerald-400" />
              </div>
            )}
            <button 
              onClick={openDashboard}
              className="p-2 rounded-lg hover:bg-surface-800/50 transition-colors group"
              title="Open Dashboard"
            >
              <LayoutDashboard size={18} className="text-surface-400 group-hover:text-primary-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 glass-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-primary-400">{stats.totalTabs}</p>
            <p className="text-[10px] text-surface-400 uppercase tracking-wider mt-0.5">Tabs</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-accent-cyan">{stats.tabsToday}</p>
            <p className="text-[10px] text-surface-400 uppercase tracking-wider mt-0.5">Today</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-accent-amber">{stats.activeReminders}</p>
            <p className="text-[10px] text-surface-400 uppercase tracking-wider mt-0.5">Reminders</p>
          </div>
        </div>
      </div>

      {/* Current Tab Section */}
      {currentTab && (
        <div className={`px-5 pb-4 relative ${showTagMenu || showReminderMenu ? 'z-50' : 'z-10'}`}>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <img 
                src={getFaviconUrl(currentTab.url)} 
                alt="" 
                className="w-8 h-8 rounded-lg bg-surface-700 mt-0.5 flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-surface-100 truncate">
                  {currentTab.title}
                </h3>
                <p className="text-xs text-surface-400 truncate mt-0.5">
                  {extractDomain(currentTab.url)}
                </p>
              </div>
            </div>
            
            {currentTrackedTab?.tag && (
              <div className="mb-3">
                <TagBadge tag={currentTrackedTab.tag} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Tag}
                  className="w-full"
                  onClick={() => { setShowTagMenu(!showTagMenu); setShowReminderMenu(false); }}
                >
                  Tag
                  <ChevronDown size={12} className={`transition-transform ${showTagMenu ? 'rotate-180' : ''}`} />
                </Button>

                {/* Tag dropdown */}
                {showTagMenu && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 glass rounded-xl p-2 
                                animate-slide-down shadow-xl shadow-black/30">
                    {TAG_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleTagSelect(option.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                                  transition-colors flex items-center gap-2
                                  ${currentTrackedTab?.tag === option.id 
                                    ? 'bg-primary-500/20 text-primary-300' 
                                    : 'hover:bg-surface-700/50 text-surface-300'}`}
                      >
                        {currentTrackedTab?.tag === option.id && <Check size={12} />}
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex-1">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Bell}
                  className="w-full"
                  onClick={() => { setShowReminderMenu(!showReminderMenu); setShowTagMenu(false); }}
                >
                  Remind
                  <ChevronDown size={12} className={`transition-transform ${showReminderMenu ? 'rotate-180' : ''}`} />
                </Button>

                {/* Reminder dropdown */}
                {showReminderMenu && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 glass rounded-xl p-2 
                                animate-slide-down shadow-xl shadow-black/30">
                    {REMINDER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleSetReminder(preset)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                                  hover:bg-surface-700/50 text-surface-300 transition-colors
                                  flex items-center gap-2"
                      >
                        <span>{preset.icon}</span>
                        {preset.label}
                      </button>
                    ))}
                    {/* Custom datetime */}
                    <div className="mt-1 pt-1 border-t border-surface-700/50">
                      <input 
                        type="datetime-local"
                        value={customDateTime}
                        onChange={(e) => setCustomDateTime(e.target.value)}
                        className="input-field text-xs mb-1.5"
                      />
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="w-full"
                        onClick={handleCustomReminder}
                        disabled={!customDateTime}
                      >
                        Set Custom Reminder
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Tabs */}
      <div className="flex-1 px-5 pb-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Recent Tabs</h2>
          <span className="text-xs text-surface-500">{recentTabs.length} tabs</span>
        </div>

        {recentTabs.length === 0 ? (
          <div className="text-center py-8">
            <BookmarkPlus size={32} className="mx-auto text-surface-600 mb-2" />
            <p className="text-xs text-surface-500">No tabs tracked yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentTabs.map((tab, index) => (
              <div 
                key={tab.id}
                className="glass-card rounded-lg p-3 flex items-center gap-3 group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <img 
                  src={tab.favicon || getFaviconUrl(tab.url)} 
                  alt="" 
                  className="w-5 h-5 rounded flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-200 truncate">{tab.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-surface-500">{extractDomain(tab.url)}</span>
                    <span className="text-[10px] text-surface-600">·</span>
                    <span className="text-[10px] text-surface-500">{timeAgo(tab.createdAt)}</span>
                  </div>
                </div>
                {tab.tag && <TagBadge tag={tab.tag} size="sm" />}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { if (typeof chrome !== 'undefined') chrome.tabs.create({ url: tab.url }); }}
                    className="p-1 rounded hover:bg-surface-700/50 text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    <ExternalLink size={12} />
                  </button>
                  <button 
                    onClick={() => removeTab(tab.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-800/50">
        <Button 
          variant="primary" 
          className="w-full"
          icon={LayoutDashboard}
          onClick={openDashboard}
        >
          Open Dashboard
        </Button>
      </div>
    </div>
  );
}
