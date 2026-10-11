import { shouldExcludeUrl, generateId, getUserIdFromAccessToken, normalizeUrl, isSafePageUrl, isBlockedDomain } from '../utils/helpers';
import { CLEANUP_ALARM, CLEANUP_AFTER_DAYS } from '../utils/constants';
import { getAllTabs, saveTabs, saveData, getAllReminders, saveReminders, getFromStorage, getSettings } from '../utils/storage';
import { fullSync } from '../utils/syncService';
import { isSupabaseConfigured } from '../utils/supabase';
import { scheduleReminderAlarms, advanceRecurringReminder } from '../utils/reminders';
import { retainTabsByPolicy } from '../utils/retention';

const AUTH_SESSION_KEY = 'mindtabs_auth_session';

// ─── Tab Tracking ────────────────────────────────────────────────

/**
 * Track a new tab when it's created/updated with a valid URL
 */
async function trackTab(tab) {
  const settings = await getSettings();
  if (settings.tracking !== true || settings.onboardingComplete !== true) return;
  // Skip incognito tabs
  if (tab.incognito) return;
  
  // Skip tabs without URLs or with excluded URLs
  if (!tab.url || shouldExcludeUrl(tab.url) || !isSafePageUrl(tab.url) || isBlockedDomain(tab.url, settings.blockedDomains)) return;
  
  // Skip pending/loading tabs without titles
  if (tab.status === 'loading' && !tab.title) return;

  const tabs = await getAllTabs();
  const normalizedUrl = normalizeUrl(tab.url);
  
  // Check if this URL is already tracked
  const existingIndex = tabs.findIndex(t => normalizeUrl(t.url) === normalizedUrl);
  
  if (existingIndex >= 0) {
    // Update existing entry
    tabs[existingIndex] = {
      ...tabs[existingIndex],
      title: tab.title || tabs[existingIndex].title,
      favicon: tab.favIconUrl || tabs[existingIndex].favicon,
      lastVisited: Date.now(),
      updatedAt: Date.now(),
    };
  } else {
    // Add new entry
    tabs.unshift({
      id: generateId(),
      title: tab.title || 'Untitled',
      url: normalizedUrl,
      favicon: tab.favIconUrl || null,
      tag: null,
      createdAt: Date.now(),
      lastVisited: Date.now(),
      updatedAt: Date.now(),
      tagUpdatedAt: Date.now(),
      archiveUpdatedAt: Date.now(),
    });
  }

  await saveTabs(tabs);
}

// Listen for tab updates (when URL changes or page finishes loading)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    trackTab(tab);
  }
});

// Listen for new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url && tab.url !== 'chrome://newtab/') {
    trackTab(tab);
  }
});


// ─── Reminders / Alarms ─────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CLEANUP_ALARM) {
    const settings = await getSettings();
    const cutoff = Date.now() - (Number(settings.retentionDays) || CLEANUP_AFTER_DAYS) * 24 * 60 * 60 * 1000;
    const [tabs, reminders] = await Promise.all([getAllTabs(), getAllReminders()]);
    const retained = retainTabsByPolicy(tabs, reminders, cutoff);
    if (retained.length !== tabs.length) await saveData(retained, reminders);
    return;
  }
  if (alarm.name === 'sync-alarm') {
    if (!isSupabaseConfigured()) return;
    const session = await getFromStorage(AUTH_SESSION_KEY);
    if (session) {
      try {
        const userId = getUserIdFromAccessToken(session.access_token);
        if (userId) {
          await fullSync(userId);
          console.log('Periodic sync completed');
        }
      } catch (err) {
        console.error('Periodic sync failed:', err);
      }
    }
    return;
  }

  if (!alarm.name.startsWith('reminder-')) return;

  const reminderId = alarm.name.replace('reminder-', '');
  const reminders = await getAllReminders();
  const reminder = reminders.find(r => r.id === reminderId);
  
  if (!reminder) return;

  const tabs = await getAllTabs();
  const tab = tabs.find(t => t.id === reminder.tabId);

  if (tab) {
    const settings = await getSettings();
    if (settings.notifications !== false) {
    // Show notification
      chrome.notifications.create(`notif-${reminder.id}`, {
      type: 'basic',
      iconUrl: tab.favicon || 'icons/icon128.png',
      title: '🔔 MindTabs Reminder',
      message: `Time to revisit: ${tab.title}`,
      buttons: [{ title: 'Open Tab' }],
      priority: 2,
      });
    }
  }

  // Mark reminder complete, or advance the next recurring occurrence.
  const updatedReminders = reminders.map(r =>
    r.id === reminderId ? advanceRecurringReminder(r) : r
  );
  const updatedReminder = updatedReminders.find(r => r.id === reminderId);
  if (updatedReminder?.status === 'pending') await chrome.alarms.create(`reminder-${reminder.id}`, { when: updatedReminder.remindAt });
  await saveReminders(updatedReminders);
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith('notif-')) return;
  
  const reminderId = notificationId.replace('notif-', '');
  const reminders = await getAllReminders();
  const reminder = reminders.find(r => r.id === reminderId);
  
  if (!reminder) return;
  
  const tabs = await getAllTabs();
  const tab = tabs.find(t => t.id === reminder.tabId);
  
  if (tab) {
    chrome.tabs.create({ url: tab.url });
  }
  
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (!notificationId.startsWith('notif-')) return;
  if (buttonIndex !== 0) return;

  const reminderId = notificationId.replace('notif-', '');
  const reminders = await getAllReminders();
  const reminder = reminders.find(r => r.id === reminderId);
  
  if (!reminder) return;
  
  const tabs = await getAllTabs();
  const tab = tabs.find(t => t.id === reminder.tabId);
  
  if (tab) {
    chrome.tabs.create({ url: tab.url });
  }
  
  chrome.notifications.clear(notificationId);
});


// ─── Extension Install ──────────────────────────────────────────

async function importOpenTabs() {
  const openTabs = await chrome.tabs.query({ windowType: 'normal' });
  await Promise.all(openTabs.map(trackTab));
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('MindTabs installed successfully!');
  }
  const settings = await getSettings();
  chrome.alarms.create('sync-alarm', { periodInMinutes: Number(settings.syncIntervalMinutes) || 5 });
  chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 7 * 24 * 60 });
  await restoreReminderAlarms();
  await importOpenTabs();
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: 'mindtabs-save-page', title: 'Save page to MindTabs', contexts: ['page'] }));
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  chrome.alarms.create('sync-alarm', { periodInMinutes: Number(settings.syncIntervalMinutes) || 5 });
  chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 7 * 24 * 60 });
  await restoreReminderAlarms();
  await importOpenTabs();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'mindtabs-save-page' && tab) await trackTab(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-dashboard') chrome.runtime.openOptionsPage();
  if (command === 'save-current-tab') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await trackTab(tab);
  }
});

async function restoreReminderAlarms() {
  const reminders = await getAllReminders();
  await scheduleReminderAlarms(reminders, chrome.alarms);
}

console.log('MindTabs background service worker loaded');
