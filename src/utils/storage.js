import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './constants';
import { normalizeSettings } from './settings';
import { normalizeWorkspaces } from './workspaces';
import { isSafePageUrl, normalizeUrl } from './helpers';
export { normalizeSettings } from './settings';

/**
 * Chrome storage wrapper with async/await support.
 * Falls back to localStorage for development outside extension context.
 */

const isExtension = typeof chrome !== 'undefined' && chrome.storage;

export async function getFromStorage(key) {
  if (isExtension) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result[key] ?? null);
      });
    });
  }
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setToStorage(key, value) {
  if (isExtension) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage set error:', e);
  }
}

export async function removeFromStorage(key) {
  if (isExtension) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }
  localStorage.removeItem(key);
}

export async function clearAllStorage() {
  if (isExtension) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }
  // Never clear the entire origin: other apps may share the same localStorage.
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export async function getAllTabs() {
  const raw = await getFromStorage(STORAGE_KEYS.TABS);
  const tabs = Array.isArray(raw) ? raw : [];
  const migrated = tabs.filter(Boolean).map((tab) => ({
    ...tab,
    id: String(tab.id || crypto.randomUUID()),
    title: typeof tab.title === 'string' ? tab.title : 'Untitled',
    url: typeof tab.url === 'string' ? normalizeUrl(tab.url) : '',
    createdAt: Number(tab.createdAt) || Date.now(),
    lastVisited: Number(tab.lastVisited) || Number(tab.createdAt) || Date.now(),
    updatedAt: Number(tab.updatedAt) || Number(tab.lastVisited) || Number(tab.createdAt) || Date.now(),
    tagUpdatedAt: Number(tab.tagUpdatedAt) || Number(tab.updatedAt) || Number(tab.createdAt) || Date.now(),
    archiveUpdatedAt: Number(tab.archiveUpdatedAt) || Number(tab.updatedAt) || Number(tab.createdAt) || Date.now(),
    isArchived: Boolean(tab.isArchived),
  })).filter(tab => tab.url && isSafePageUrl(tab.url));
  if (JSON.stringify(raw) !== JSON.stringify(migrated)) await setToStorage(STORAGE_KEYS.TABS, migrated);
  await setToStorage(STORAGE_KEYS.SCHEMA_VERSION, STORAGE_SCHEMA_VERSION);
  return migrated;
}

export async function saveTabs(tabs) {
  await setToStorage(STORAGE_KEYS.TABS, tabs);
}

export async function getDeletedTabs() {
  const deleted = await getFromStorage(STORAGE_KEYS.DELETED_TABS);
  return Array.isArray(deleted) ? deleted : [];
}

export async function saveDeletedTabs(deleted) {
  await setToStorage(STORAGE_KEYS.DELETED_TABS, deleted);
}

export async function saveData(tabs, reminders) {
  if (isExtension) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.TABS]: tabs, [STORAGE_KEYS.REMINDERS]: reminders }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }
  try {
    localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(tabs));
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (error) {
    throw new Error(`Could not save MindTabs data: ${error.message}`);
  }
}

export async function getAllReminders() {
  const raw = await getFromStorage(STORAGE_KEYS.REMINDERS);
  const reminders = (Array.isArray(raw) ? raw : []).filter(Boolean).map((reminder) => ({
    ...reminder,
    id: String(reminder.id || crypto.randomUUID()),
    tabId: String(reminder.tabId || ''),
    remindAt: Number(reminder.remindAt) || 0,
    createdAt: Number(reminder.createdAt) || Date.now(),
    updatedAt: Number(reminder.updatedAt) || Number(reminder.createdAt) || Date.now(),
    status: ['pending', 'completed', 'cancelled'].includes(reminder.status) ? reminder.status : 'pending',
    repeat: ['daily', 'weekly'].includes(reminder.repeat) ? reminder.repeat : null,
  })).filter(reminder => reminder.tabId && reminder.remindAt > 0);
  if (JSON.stringify(raw) !== JSON.stringify(reminders)) await setToStorage(STORAGE_KEYS.REMINDERS, reminders);
  await setToStorage(STORAGE_KEYS.SCHEMA_VERSION, STORAGE_SCHEMA_VERSION);
  return reminders;
}

export async function saveReminders(reminders) {
  await setToStorage(STORAGE_KEYS.REMINDERS, reminders);
}

export async function getSettings() {
  const settings = await getFromStorage(STORAGE_KEYS.SETTINGS);
  return normalizeSettings(settings);
}

export async function saveSettings(settings) {
  await setToStorage(STORAGE_KEYS.SETTINGS, settings);
}

export async function getWorkspaces() {
  const workspaces = await getFromStorage(STORAGE_KEYS.WORKSPACES);
  const normalized = normalizeWorkspaces(workspaces);
  if (JSON.stringify(workspaces) !== JSON.stringify(normalized)) await setToStorage(STORAGE_KEYS.WORKSPACES, normalized);
  return normalized;
}

export async function saveWorkspaces(workspaces) {
  await setToStorage(STORAGE_KEYS.WORKSPACES, workspaces);
}
