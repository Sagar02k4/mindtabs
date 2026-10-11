import { create } from 'zustand';
import { getAllTabs, saveTabs, saveData, getAllReminders, saveReminders, getFromStorage, getDeletedTabs, saveDeletedTabs, getWorkspaces, saveWorkspaces } from '../utils/storage';
import { generateId, getUserIdFromAccessToken, normalizeUrl, validateBackup, isSafePageUrl } from '../utils/helpers';
import { FREE_LIMITS } from '../utils/constants';
import { pushToCloud } from '../utils/syncService';
import { scheduleReminderAlarms, isValidReminderTime, filterRemindersForTabs } from '../utils/reminders';

const AUTH_SESSION_KEY = 'mindtabs_auth_session';

/**
 * Debounced sync trigger — pushes local data to cloud if user is authenticated.
 * Uses a 2s debounce to batch rapid consecutive writes.
 */
let syncTimer = null;
function triggerSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const session = await getFromStorage(AUTH_SESSION_KEY);
      if (!session) return;
      // Decode user ID from the access token (JWT payload)
      const userId = getUserIdFromAccessToken(session.access_token);
      if (userId) {
        const result = await pushToCloud(userId);
        if (!result.success) setStoreActionError(result.error || 'Cloud sync failed.');
      }
    } catch (err) {
      console.warn('Sync trigger failed:', err);
    }
  }, 2000);
}

let setStoreActionError = () => {};

const useTabStore = create((set, get) => ({
  tabs: [],
  reminders: [],
  loading: true,
  searchQuery: '',
  activeTag: 'all',
  sortBy: 'newest',
  actionError: null,
  lastDeleted: null,

  // Initialize store from storage
  init: async () => {
    const [tabs, reminders] = await Promise.all([
      getAllTabs(),
      getAllReminders(),
    ]);
    const validReminders = filterRemindersForTabs(reminders || [], tabs || []);
    if (validReminders.length !== (reminders || []).length) await saveReminders(validReminders);
    set({ tabs: tabs || [], reminders: validReminders, loading: false });
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await scheduleReminderAlarms(validReminders, chrome.alarms);
    }
  },

  // Tab actions
  addTab: async (tabData) => {
    if (!isSafePageUrl(tabData.url)) {
      set({ actionError: 'Only http and https pages can be saved.' });
      return null;
    }
    const { tabs } = get();
    // Check if tab with same URL already exists
    const normalizedUrl = normalizeUrl(tabData.url);
    const existing = tabs.find(t => normalizeUrl(t.url) === normalizedUrl);
    if (existing) return existing;
    if (tabs.filter(t => !t.isArchived).length >= FREE_LIMITS.MAX_TABS) {
      set({ actionError: `Free accounts can track up to ${FREE_LIMITS.MAX_TABS} active tabs.` });
      return null;
    }

    const now = Date.now();
    const newTab = {
      id: generateId(),
      title: tabData.title || 'Untitled',
      url: normalizedUrl,
      favicon: tabData.favicon || null,
      tag: null,
      isArchived: false,
      createdAt: now,
      lastVisited: now,
      updatedAt: now,
      tagUpdatedAt: now,
      archiveUpdatedAt: now,
    };
    const updated = [newTab, ...tabs];
    set({ tabs: updated, actionError: null });
    await saveTabs(updated);
    triggerSync();
    return newTab;
  },

  removeTab: async (tabId) => {
    const { tabs, reminders } = get();
    const deletedTab = tabs.find(t => t.id === tabId);
    const deletedReminders = reminders.filter(r => r.tabId === tabId);
    const updatedTabs = tabs.filter(t => t.id !== tabId);
    const updatedReminders = reminders.filter(r => r.tabId !== tabId);
    set({ tabs: updatedTabs, reminders: updatedReminders, lastDeleted: deletedTab ? { tab: deletedTab, reminders: deletedReminders } : null });
    await saveData(updatedTabs, updatedReminders);
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await scheduleReminderAlarms(updatedReminders, chrome.alarms);
    }
    const deleted = await getDeletedTabs();
    await saveDeletedTabs([...deleted.filter(item => item.id !== tabId), { id: tabId, deletedAt: Date.now() }]);
    triggerSync();
  },

  undoLastDelete: async () => {
    const { lastDeleted, tabs, reminders } = get();
    if (!lastDeleted) return false;
    const restoredTabs = [lastDeleted.tab, ...tabs];
    const restoredReminders = [...reminders, ...lastDeleted.reminders];
    await saveData(restoredTabs, restoredReminders);
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await scheduleReminderAlarms(restoredReminders, chrome.alarms);
    }
    const deleted = await getDeletedTabs();
    await saveDeletedTabs(deleted.filter(item => item.id !== lastDeleted.tab.id));
    set({ tabs: restoredTabs, reminders: restoredReminders, lastDeleted: null });
    triggerSync();
    return true;
  },

  updateTag: async (tabId, tag) => {
    const { tabs } = get();
    const now = Date.now();
    const updated = tabs.map(t =>
      t.id === tabId ? { ...t, tag, tagUpdatedAt: now, updatedAt: now } : t
    );
    set({ tabs: updated });
    await saveTabs(updated);
    triggerSync();
  },

  toggleArchive: async (tabId) => {
    const { tabs } = get();
    const now = Date.now();
    const updated = tabs.map(t =>
      t.id === tabId ? { ...t, isArchived: !t.isArchived, archiveUpdatedAt: now, updatedAt: now } : t
    );
    set({ tabs: updated });
    await saveTabs(updated);
    triggerSync();
  },

  // Reminder actions
  setReminder: async (tabId, remindAt, repeat = null) => {
    const { reminders, tabs } = get();
    if (!tabs.some(tab => tab.id === tabId)) {
      set({ actionError: 'That saved page is no longer available.' });
      return null;
    }
    if (!isValidReminderTime(remindAt)) {
      set({ actionError: 'Choose a reminder time in the future.' });
      return null;
    }
    // Remove existing reminder for this tab
    const filtered = reminders.filter(r => r.tabId !== tabId);
    if (filtered.length >= FREE_LIMITS.MAX_REMINDERS) {
      set({ actionError: `Free accounts can have up to ${FREE_LIMITS.MAX_REMINDERS} active reminders.` });
      return null;
    }
    const newReminder = {
      id: generateId(),
      tabId,
      remindAt,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      repeat: ['daily', 'weekly'].includes(repeat) ? repeat : null,
    };
    const updated = [...filtered, newReminder];
    set({ reminders: updated, actionError: null });
    await saveReminders(updated);
    triggerSync();

    // Reconcile the complete set so replacing a reminder also removes its old alarm.
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await scheduleReminderAlarms(updated, chrome.alarms);
    }

    return newReminder;
  },

  clearReminder: async (reminderId) => {
    const { reminders } = get();
    const updated = reminders.filter(r => r.id !== reminderId);
    set({ reminders: updated });
    await saveReminders(updated);
    triggerSync();

    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await chrome.alarms.clear(`reminder-${reminderId}`);
    }
  },

  resetReminder: async (tabId, remindAt) => {
    const { reminders } = get();
    const current = reminders.find(r => r.tabId === tabId && r.status === 'pending');
    if (current) await get().clearReminder(current.id);
    return get().setReminder(tabId, remindAt);
  },

  // Filter / search
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setSortBy: (sort) => set({ sortBy: sort }),
  clearActionError: () => set({ actionError: null }),

  // Computed: get filtered tabs
  getFilteredTabs: () => {
    const { tabs, searchQuery, activeTag, sortBy } = get();
    let filtered = [...tabs];

    // Filter by archived status
    if (activeTag !== 'archived') {
      filtered = filtered.filter(t => !t.isArchived);
    } else {
      filtered = filtered.filter(t => t.isArchived);
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(q) ||
        t.url?.toLowerCase().includes(q)
      );
    }

    // Filter by tag
    if (activeTag && activeTag !== 'all' && activeTag !== 'archived') {
      if (activeTag === 'untagged') {
        filtered = filtered.filter(t => !t.tag);
      } else {
        filtered = filtered.filter(t => t.tag === activeTag);
      }
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'title':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return filtered;
  },

  // Get reminder for a specific tab
  getReminderForTab: (tabId) => {
    const { reminders } = get();
    return reminders.find(r => r.tabId === tabId && r.status === 'pending');
  },

  // Delete all data
  deleteAllData: async () => {
    set({ tabs: [], reminders: [], searchQuery: '', activeTag: 'all' });
    await saveData([], []);
    await Promise.all([saveWorkspaces([]), saveDeletedTabs([])]);
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await scheduleReminderAlarms([], chrome.alarms);
    }
    triggerSync();
  },

  bulkUpdate: async (tabIds, action, value) => {
    const { tabs } = get();
    const now = Date.now();
    const selected = new Set(tabIds);
    const updated = tabs.map(tab => {
      if (!selected.has(tab.id)) return tab;
      if (action === 'archive') return { ...tab, isArchived: true, archiveUpdatedAt: now, updatedAt: now };
      if (action === 'unarchive') return { ...tab, isArchived: false, archiveUpdatedAt: now, updatedAt: now };
      if (action === 'tag') return { ...tab, tag: value || null, tagUpdatedAt: now, updatedAt: now };
      return tab;
    });
    set({ tabs: updated });
    await saveTabs(updated);
    triggerSync();
  },

  importData: async (data) => {
    const validated = validateBackup(data);
    const existingTabs = get().tabs;
    const existingReminders = get().reminders;
    const tabsByUrl = new Map([...existingTabs, ...validated.tabs].map(tab => [normalizeUrl(tab.url), tab]));
    const remindersById = new Map([...existingReminders, ...validated.reminders].map(reminder => [reminder.id, reminder]));
    await saveData(Array.from(tabsByUrl.values()), Array.from(remindersById.values()));
    await get().init();
    triggerSync();
  },

  saveWorkspace: async (name, tabIds) => {
    const workspaces = await getWorkspaces();
    const now = Date.now();
    const workspace = { id: generateId(), name: String(name || 'Untitled workspace').slice(0, 100), tabIds, createdAt: now, updatedAt: now };
    await saveWorkspaces([...workspaces, workspace]);
    return workspace;
  },

  getWorkspaces,

  // Stats
  getStats: () => {
    const { tabs, reminders } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const weekTimestamp = todayTimestamp - 6 * 24 * 60 * 60 * 1000;

    return {
      totalTabs: tabs.filter(t => !t.isArchived).length,
      archivedTabs: tabs.filter(t => t.isArchived).length,
      tabsToday: tabs.filter(t => t.createdAt >= todayTimestamp && !t.isArchived).length,
      tabsThisWeek: tabs.filter(t => t.createdAt >= weekTimestamp && !t.isArchived).length,
      uniqueDomains: new Set(tabs.filter(t => !t.isArchived).map(t => { try { return new URL(t.url).hostname; } catch { return t.url; } })).size,
      activeReminders: reminders.filter(r => r.status === 'pending').length,
      tagBreakdown: tabs.reduce((acc, t) => {
        const tag = t.tag || 'untagged';
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {}),
    };
  },
}));

setStoreActionError = (message) => useTabStore.setState({ actionError: message });

export default useTabStore;
