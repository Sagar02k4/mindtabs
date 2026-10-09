import { supabase, isSupabaseConfigured } from './supabase';
import { getAllTabs, saveTabs, getAllReminders, saveReminders, getFromStorage, setToStorage } from './storage';

const LAST_SYNC_KEY = 'mindtabs_last_sync';

/**
 * Push local tabs and reminders to Supabase
 */
export async function pushToCloud(userId) {
  if (!isSupabaseConfigured() || !userId) return { success: false };

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
        created_at: t.createdAt,
        last_visited: t.lastVisited || t.createdAt,
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
  if (!isSupabaseConfigured() || !userId) return { success: false };

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
        createdAt: ct.created_at,
        lastVisited: ct.last_visited,
      })),
      'id',
      (a, b) => (a.lastVisited || a.createdAt) >= (b.lastVisited || b.createdAt) ? a : b
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
      })),
      'id',
      (a, b) => a.createdAt >= b.createdAt ? a : b
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
  if (!isSupabaseConfigured() || !userId) return { success: false };

  const pullResult = await pullFromCloud(userId);
  if (!pullResult.success) return pullResult;

  const pushResult = await pushToCloud(userId);
  return pushResult;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime() {
  return await getFromStorage(LAST_SYNC_KEY);
}

/**
 * Merge two lists by a key field with a conflict resolver
 */
function mergeLists(localList, cloudList, keyField, conflictResolver) {
  const map = new Map();

  // Add all local items
  for (const item of localList) {
    map.set(item[keyField], item);
  }

  // Merge cloud items
  for (const item of cloudList) {
    const key = item[keyField];
    if (map.has(key)) {
      // Conflict: use resolver
      map.set(key, conflictResolver(map.get(key), item));
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}
