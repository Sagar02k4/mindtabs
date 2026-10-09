import { create } from 'zustand';
import { getAllTabs, saveTabs, getAllReminders, saveReminders, getFromStorage } from '../utils/storage';
import { generateId, getUserIdFromAccessToken } from '../utils/helpers';
import { FREE_LIMITS } from '../utils/constants';
import { pushToCloud } from '../utils/syncService';

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
        await pushToCloud(userId);
      }
    } catch (err) {
      console.warn('Sync trigger failed:', err);
    }
  }, 2000);
}

const useTabStore = create((set, get) => ({
  tabs: [],
  reminders: [],
  loading: true,
  searchQuery: '',
  activeTag: 'all',
  sortBy: 'newest',
  actionError: null,

  // Initialize store from storage
  init: async () => {
    const [tabs, reminders] = await Promise.all([
      getAllTabs(),
      getAllReminders(),
    ]);
    set({ tabs: tabs || [], reminders: reminders || [], loading: false });
  },

  // Tab actions
  addTab: async (tabData) => {
    const { tabs } = get();
    // Check if tab with same URL already exists
    const existing = tabs.find(t => t.url === tabData.url);
    if (existing) return existing;
    if (tabs.filter(t => !t.isArchived).length >= FREE_LIMITS.MAX_TABS) {
      set({ actionError: `Free accounts can track up to ${FREE_LIMITS.MAX_TABS} active tabs.` });
      return null;
    }

    const newTab = {
      id: generateId(),
      title: tabData.title || 'Untitled',
      url: tabData.url,
      favicon: tabData.favicon || null,
      tag: null,
      isArchived: false,
      createdAt: Date.now(),
      lastVisited: Date.now(),
    };
    const updated = [newTab, ...tabs];
    set({ tabs: updated, actionError: null });
    await saveTabs(updated);
    triggerSync();
    return newTab;
  },

  removeTab: async (tabId) => {
    const { tabs, reminders } = get();
    const updatedTabs = tabs.filter(t => t.id !== tabId);
    const updatedReminders = reminders.filter(r => r.tabId !== tabId);
    set({ tabs: updatedTabs, reminders: updatedReminders });
    await Promise.all([saveTabs(updatedTabs), saveReminders(updatedReminders)]);
    triggerSync();
  },

  updateTag: async (tabId, tag) => {
    const { tabs } = get();
    const updated = tabs.map(t => 
      t.id === tabId ? { ...t, tag } : t
    );
    set({ tabs: updated });
    await saveTabs(updated);
    triggerSync();
  },

  toggleArchive: async (tabId) => {
    const { tabs } = get();
    const updated = tabs.map(t => 
      t.id === tabId ? { ...t, isArchived: !t.isArchived } : t
    );
    set({ tabs: updated });
    await saveTabs(updated);
    triggerSync();
  },

  // Reminder actions
  setReminder: async (tabId, remindAt) => {
    const { reminders } = get();
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
    };
    const updated = [...filtered, newReminder];
    set({ reminders: updated, actionError: null });
    await saveReminders(updated);
    triggerSync();

    // Set Chrome alarm
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      chrome.alarms.create(`reminder-${newReminder.id}`, {
        when: remindAt,
      });
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
      chrome.alarms.clear(`reminder-${reminderId}`);
    }
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
    await Promise.all([saveTabs([]), saveReminders([])]);
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      chrome.alarms.clearAll();
    }
    triggerSync();
  },

  // Stats
  getStats: () => {
    const { tabs, reminders } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return {
      totalTabs: tabs.filter(t => !t.isArchived).length,
      archivedTabs: tabs.filter(t => t.isArchived).length,
      tabsToday: tabs.filter(t => t.createdAt >= todayTimestamp && !t.isArchived).length,
      activeReminders: reminders.filter(r => r.status === 'pending').length,
      tagBreakdown: tabs.reduce((acc, t) => {
        const tag = t.tag || 'untagged';
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {}),
    };
  },
}));

export default useTabStore;
