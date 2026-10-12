import { supabase, isSupabaseConfigured } from './supabase';
import { getAllTabs, saveTabs, getAllReminders, saveReminders, getFromStorage, setToStorage, getDeletedTabs } from './storage';
import { mergeLists, mergeTabs } from './merge';
import { isSafePageUrl, normalizeUrl, sanitizeFaviconUrl, normalizeCloudReminder, generateId } from './helpers';
import { filterRemindersForTabs } from './reminders';

export { mergeLists, mergeTabs } from './merge';

const LAST_SYNC_KEY = 'mindtabs_last_sync';
const SYNC_STATUS_KEY = 'mindtabs_sync_status';
const SYNC_LOCK_KEY = 'mindtabs_sync_lock';
const CLOUD_PAGE_SIZE = 500;
const CLOUD_MAX_ROWS = 10000;
let syncQueue = Promise.resolve();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function withRetry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(300 * (2 ** attempt));
    }
  }
  throw lastError;
}

async function withSyncLock(operation) {
  const storage = typeof chrome !== 'undefined' && chrome.storage?.session ? chrome.storage.session : null;
  if (!storage) return operation();
  const readLock = () => new Promise((resolve, reject) => storage.get([SYNC_LOCK_KEY], result => {
    if (chrome.runtime?.lastError) {
      reject(new Error(chrome.runtime.lastError.message));
      return;
    }
    resolve(result[SYNC_LOCK_KEY]);
  }));
  const writeLock = (lock) => new Promise((resolve, reject) => storage.set({ [SYNC_LOCK_KEY]: lock }, () => {
    if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
    else resolve();
  }));
  const removeLock = async (token) => {
    const current = await readLock();
    if (current?.token !== token) return;
    await new Promise((resolve, reject) => storage.remove([SYNC_LOCK_KEY], () => {
      if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    }));
  };
  const existing = await readLock();
  if (existing && existing.expiresAt > Date.now()) return { success: false, error: 'Another sync is already running.' };
  const lock = { token: generateId(), expiresAt: Date.now() + 30000 };
  await writeLock(lock);
  try { return await operation(); } finally {
    try { await removeLock(lock.token); } catch (error) { console.warn('Could not release sync lock:', error); }
  }
}

async function fetchAllUserRows(table, userId) {
  const rows = [];
  for (let offset = 0; offset < CLOUD_MAX_ROWS; offset += CLOUD_PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('id', { ascending: true }).range(offset, offset + CLOUD_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < CLOUD_PAGE_SIZE) return rows;
  }
  throw new Error(`Cloud ${table} data exceeds the safety limit of ${CLOUD_MAX_ROWS} records.`);
}

/**
 * Push local tabs and reminders to Supabase
 */
export async function pushToCloud(userId) {
  if (!isSupabaseConfigured() || !userId) return { success: false, error: 'Cloud sync is not configured or you are signed out.' };

  try {
    const [tabs, reminders, deletedTabs] = await Promise.all([getAllTabs(), getAllReminders(), getDeletedTabs()]);

    // Upsert tabs
    if (tabs.length > 0 || deletedTabs.length > 0) {
      const tabRows = tabs.map(t => ({
        id: t.id,
        user_id: userId,
        title: t.title,
        url: t.url,
        favicon: t.favicon,
        tag: t.tag,
        is_archived: Boolean(t.isArchived),
        created_at: t.createdAt,
        last_visited: t.lastVisited || t.createdAt,
        updated_at: t.updatedAt || t.createdAt,
        tag_updated_at: t.tagUpdatedAt || t.updatedAt || t.createdAt,
        archive_updated_at: t.archiveUpdatedAt || t.updatedAt || t.createdAt,
      })).concat(deletedTabs.map(t => ({ id: t.id, user_id: userId, title: null, url: null, created_at: t.deletedAt, deleted_at: t.deletedAt })));

      const { error: tabError } = await supabase
        .from('tabs')
        .upsert(tabRows, { onConflict: 'id' });

      if (tabError) throw tabError;
    }

    // Upsert reminders
    if (reminders.length > 0) {
      const reminderRows = reminders.map(r => ({
        id: r.id,
        user_id: userId,
        tab_id: r.tabId,
        remind_at: r.remindAt,
        status: r.status,
        created_at: r.createdAt,
        updated_at: r.updatedAt || r.createdAt,
        repeat: r.repeat || null,
      }));

      const { error: remError } = await supabase
        .from('reminders')
        .upsert(reminderRows, { onConflict: 'id' });

      if (remError) throw remError;
    }

    // Delete cloud tabs that no longer exist locally
    const localTabIds = tabs.map(t => t.id);
    const cloudTabs = await fetchAllUserRows('tabs', userId);

    if (cloudTabs) {
      const toDelete = cloudTabs
        .filter(ct => !localTabIds.includes(ct.id) && !deletedTabs.some(dt => dt.id === ct.id))
        .map(ct => ct.id);

      if (toDelete.length > 0) {
        const { error } = await supabase.from('tabs').delete().eq('user_id', userId).in('id', toDelete);
        if (error) throw error;
      }
    }

    const localReminderIds = reminders.map(r => r.id);
    const cloudReminders = await fetchAllUserRows('reminders', userId);

    const remindersToDelete = (cloudReminders || [])
      .filter(cr => !localReminderIds.includes(cr.id))
      .map(cr => cr.id);
    if (remindersToDelete.length > 0) {
      const { error } = await supabase.from('reminders').delete().eq('user_id', userId).in('id', remindersToDelete);
      if (error) throw error;
    }

    await setToStorage(LAST_SYNC_KEY, Date.now());
    return { success: true };
  } catch (err) {
    console.error('Push to cloud failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Pull tabs and reminders from Supabase and merge with local
 */
export async function pullFromCloud(userId) {
  if (!isSupabaseConfigured() || !userId) return { success: false, error: 'Cloud sync is not configured or you are signed out.' };

  try {
    const [cloudTabs, cloudReminders] = await Promise.all([
      fetchAllUserRows('tabs', userId),
      fetchAllUserRows('reminders', userId),
    ]);

    const localTabs = await getAllTabs();
    const localReminders = await getAllReminders();
    const cloudDeletedIds = new Set(cloudTabs.filter(tab => tab.deleted_at).map(tab => String(tab.id)));

    // Merge tabs (last-write-wins based on last_visited / createdAt)
    const mergedTabs = mergeLists(
      localTabs.filter(tab => !cloudDeletedIds.has(tab.id)),
      cloudTabs.filter(ct => !ct.deleted_at && isSafePageUrl(ct.url)).map(ct => ({
        id: String(ct.id),
        title: String(ct.title || 'Untitled').slice(0, 500),
        url: normalizeUrl(ct.url),
        favicon: sanitizeFaviconUrl(ct.favicon),
        tag: ct.tag ? String(ct.tag).slice(0, 100) : null,
        isArchived: Boolean(ct.is_archived),
        createdAt: ct.created_at,
        lastVisited: ct.last_visited,
        updatedAt: ct.updated_at || ct.last_visited || ct.created_at,
        tagUpdatedAt: ct.tag_updated_at || ct.updated_at || ct.created_at,
        archiveUpdatedAt: ct.archive_updated_at || ct.updated_at || ct.created_at,
      })),
      'id',
      mergeTabs
    );

    // Merge reminders (last-write-wins based on createdAt)
    const mergedReminders = mergeLists(
      localReminders,
      cloudReminders.map(reminder => normalizeCloudReminder(reminder)).filter(Boolean),
      'id',
      (a, b) => (a.updatedAt || a.createdAt) >= (b.updatedAt || b.createdAt) ? a : b
    );

    const validReminders = filterRemindersForTabs(mergedReminders, mergedTabs);
    await Promise.all([saveTabs(mergedTabs), saveReminders(validReminders)]);
    await setToStorage(LAST_SYNC_KEY, Date.now());

    return { success: true, tabs: mergedTabs, reminders: validReminders };
  } catch (err) {
    console.error('Pull from cloud failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Full bidirectional sync: pull → merge → push
 */
export async function fullSync(userId) {
  if (!isSupabaseConfigured() || !userId) return { success: false, error: 'Cloud sync is not configured or you are signed out.' };

  const run = async () => {
    const lastSyncAttempt = Date.now();
    await setToStorage(SYNC_STATUS_KEY, { status: 'running', lastSyncAttempt, error: null });
    try {
      await withRetry(async () => {
        const result = await pullFromCloud(userId);
        if (!result.success) throw new Error(result.error || 'Cloud pull failed.');
        return result;
      });
      const result = await withRetry(async () => {
        const result = await pushToCloud(userId);
        if (!result.success) throw new Error(result.error || 'Cloud push failed.');
        return result;
      });
      await setToStorage(SYNC_STATUS_KEY, { status: 'success', lastSyncAttempt, lastSyncSuccess: Date.now(), error: null });
      return result;
    } catch (error) {
      const message = error.message || 'Cloud sync failed.';
      await setToStorage(SYNC_STATUS_KEY, { status: 'error', lastSyncAttempt, error: message });
      return { success: false, error: message };
    }
  };
  const result = syncQueue.then(() => withSyncLock(run), () => withSyncLock(run));
  syncQueue = result.catch(() => undefined);
  return result;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime() {
  return await getFromStorage(LAST_SYNC_KEY);
}

export async function getSyncStatus() {
  return (await getFromStorage(SYNC_STATUS_KEY)) || { status: 'idle', lastSyncAttempt: null, error: null };
}

/**
 * Merge two lists by a key field with a conflict resolver
 */
