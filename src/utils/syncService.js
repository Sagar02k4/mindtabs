import { supabase, isSupabaseConfigured } from './supabase';
import { getAllTabs, saveTabs, getAllReminders, saveReminders, getFromStorage, setToStorage } from './storage';
import { mergeLists } from './merge';

export { mergeLists } from './merge';

const LAST_SYNC_KEY = 'mindtabs_last_sync';
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

/**
 * Push local tabs and reminders to Supabase
 */
export async function pushToCloud(userId) {
  if (!isSupabaseConfigured() || !userId) return { success: false, error: 'Cloud sync is not configured or you are signed out.' };

  try {
    const [tabs, reminders] = await Promise.all([getAllTabs(), getAllReminders()]);

    // Upsert tabs
    if (tabs.length > 0) {
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
      }));

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
      }));

      const { error: remError } = await supabase
        .from('reminders')
        .upsert(reminderRows, { onConflict: 'id' });

      if (remError) throw remError;
    }

    // Delete cloud tabs that no longer exist locally
    const localTabIds = tabs.map(t => t.id);
    const { data: cloudTabs, error: cloudTabsError } = await supabase
      .from('tabs')
      .select('id')
      .eq('user_id', userId);
    if (cloudTabsError) throw cloudTabsError;

    if (cloudTabs) {
      const toDelete = cloudTabs
        .filter(ct => !localTabIds.includes(ct.id))
        .map(ct => ct.id);

      if (toDelete.length > 0) {
        const { error } = await supabase.from('tabs').delete().in('id', toDelete);
        if (error) throw error;
      }
    }

    const localReminderIds = reminders.map(r => r.id);
    const { data: cloudReminders, error: cloudRemindersError } = await supabase
      .from('reminders')
      .select('id')
      .eq('user_id', userId);
    if (cloudRemindersError) throw cloudRemindersError;

    const remindersToDelete = (cloudReminders || [])
      .filter(cr => !localReminderIds.includes(cr.id))
      .map(cr => cr.id);
    if (remindersToDelete.length > 0) {
      const { error } = await supabase.from('reminders').delete().in('id', remindersToDelete);
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
    const [tabsResult, remindersResult] = await Promise.all([
      supabase.from('tabs').select('*').eq('user_id', userId),
      supabase.from('reminders').select('*').eq('user_id', userId),
    ]);
    if (tabsResult.error) throw tabsResult.error;
    if (remindersResult.error) throw remindersResult.error;
    const { data: cloudTabs } = tabsResult;
    const { data: cloudReminders } = remindersResult;

    const localTabs = await getAllTabs();
    const localReminders = await getAllReminders();

    // Merge tabs (last-write-wins based on last_visited / createdAt)
    const mergedTabs = mergeLists(
      localTabs,
      (cloudTabs || []).map(ct => ({
        id: ct.id,
        title: ct.title,
        url: ct.url,
        favicon: ct.favicon,
        tag: ct.tag,
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
      (cloudReminders || []).map(cr => ({
        id: cr.id,
        tabId: cr.tab_id,
        remindAt: cr.remind_at,
        status: cr.status,
        createdAt: cr.created_at,
        updatedAt: cr.updated_at || cr.created_at,
      })),
      'id',
      (a, b) => (a.updatedAt || a.createdAt) >= (b.updatedAt || b.createdAt) ? a : b
    );

    await Promise.all([saveTabs(mergedTabs), saveReminders(mergedReminders)]);
    await setToStorage(LAST_SYNC_KEY, Date.now());

    return { success: true, tabs: mergedTabs, reminders: mergedReminders };
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
    try {
      const pullResult = await withRetry(async () => {
        const result = await pullFromCloud(userId);
        if (!result.success) throw new Error(result.error || 'Cloud pull failed.');
        return result;
      });
      return withRetry(async () => {
        const result = await pushToCloud(userId);
        if (!result.success) throw new Error(result.error || 'Cloud push failed.');
        return result;
      });
    } catch (error) {
      return { success: false, error: error.message || 'Cloud sync failed.' };
    }
  };
  const result = syncQueue.then(run, run);
  syncQueue = result.catch(() => undefined);
  return result;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime() {
  return await getFromStorage(LAST_SYNC_KEY);
}

function mergeTabs(local, cloud) {
  const localUpdated = local.updatedAt || local.createdAt;
  const cloudUpdated = cloud.updatedAt || cloud.createdAt;
  return {
    ...(localUpdated >= cloudUpdated ? cloud : local),
    tag: (local.tagUpdatedAt || localUpdated) >= (cloud.tagUpdatedAt || cloudUpdated) ? local.tag : cloud.tag,
    isArchived: (local.archiveUpdatedAt || localUpdated) >= (cloud.archiveUpdatedAt || cloudUpdated) ? Boolean(local.isArchived) : Boolean(cloud.isArchived),
    tagUpdatedAt: Math.max(local.tagUpdatedAt || 0, cloud.tagUpdatedAt || 0),
    archiveUpdatedAt: Math.max(local.archiveUpdatedAt || 0, cloud.archiveUpdatedAt || 0),
    updatedAt: Math.max(localUpdated, cloudUpdated),
  };
}

/**
 * Merge two lists by a key field with a conflict resolver
 */
