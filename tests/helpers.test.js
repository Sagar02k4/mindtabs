import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, isSafePageUrl, validateBackup, isBlockedDomain, encryptBackup, decryptBackup, parseCsvBackup, getFaviconUrl } from '../src/utils/helpers.js';
import { getFuturePendingReminders, scheduleReminderAlarms, advanceRecurringReminder, isValidReminderTime, filterRemindersForTabs } from '../src/utils/reminders.js';
import { normalizeSettings } from '../src/utils/settings.js';
import { normalizeWorkspaces } from '../src/utils/workspaces.js';
import { retainTabsByPolicy } from '../src/utils/retention.js';
import { isMatchingOAuthCallback } from '../src/utils/authSecurity.js';

test('normalizeUrl groups tracking variants of one page', () => {
  assert.equal(
    normalizeUrl('https://www.example.com/article/?utm_source=newsletter&fbclid=abc#comments'),
    'https://www.example.com/article'
  );
});

test('normalizeUrl preserves meaningful query parameters', () => {
  assert.equal(
    normalizeUrl('https://example.com/search?q=mindtabs&utm_medium=email'),
    'https://example.com/search?q=mindtabs'
  );
});

test('normalizeUrl strips embedded URL credentials', () => {
  assert.equal(normalizeUrl('https://alice:secret@example.com/private?view=1'), 'https://example.com/private?view=1');
});

test('normalizeUrl strips credential-like query parameters but keeps ordinary filters', () => {
  assert.equal(normalizeUrl('https://example.com/report?token=secret&team=design&api_key=private'), 'https://example.com/report?team=design');
});

test('safe page validation rejects executable URL schemes', () => {
  assert.equal(isSafePageUrl('javascript:alert(1)'), false);
  assert.equal(isSafePageUrl('https://example.com/page'), true);
});

test('favicon fallback does not disclose the tracked hostname', () => {
  assert.equal(getFaviconUrl('https://private.example/account'), '/icons/icon16.png');
  assert.equal(getFaviconUrl('javascript:alert(1)'), null);
});

test('backup validation removes unsafe and orphaned records', () => {
  const result = validateBackup({
    tabs: [{ id: '1', url: 'https://example.com/?utm_source=x' }, { id: '2', url: 'javascript:bad()' }],
    reminders: [{ id: 'r1', tabId: '1', remindAt: Date.now() }, { id: 'r2', tabId: 'missing', remindAt: Date.now() }],
  });
  assert.equal(result.tabs.length, 1);
  assert.equal(result.reminders.length, 1);
});

test('blocked domains match subdomains', () => {
  assert.equal(isBlockedDomain('https://mail.example.com/inbox', ['example.com']), true);
  assert.equal(isBlockedDomain('https://docs.other.com', ['example.com']), false);
});

test('encrypted backups round-trip and reject a wrong password', async () => {
  const backup = { tabs: [{ id: '1', url: 'https://example.com' }], reminders: [] };
  const encrypted = await encryptBackup(backup, 'correct horse battery');
  assert.equal((await decryptBackup(encrypted, 'correct horse battery')).tabs[0].url, backup.tabs[0].url);
  await assert.rejects(() => decryptBackup(encrypted, 'wrong password'), /Could not decrypt/);
});

test('alarm restoration schedules only future pending reminders', async () => {
  const alarms = { create: async (name, info) => ({ name, info }) };
  const reminders = [{ id: 'past', status: 'pending', remindAt: 10 }, { id: 'future', status: 'pending', remindAt: 200 }, { id: 'done', status: 'completed', remindAt: 300 }];
  assert.deepEqual(getFuturePendingReminders(reminders, 100).map(item => item.id), ['future']);
  assert.equal(await scheduleReminderAlarms(reminders, alarms, 100), 1);
});

test('alarm restoration clears stale reminder alarms before rebuilding', async () => {
  const cleared = [];
  const alarms = {
    getAll: async () => [{ name: 'reminder-stale' }, { name: 'sync-alarm' }],
    clear: async (name) => { cleared.push(name); return true; },
    create: async () => undefined,
  };
  await scheduleReminderAlarms([{ id: 'future', status: 'pending', remindAt: 200 }], alarms, 100);
  assert.deepEqual(cleared, ['reminder-stale']);
});

test('CSV backups round-trip quoted titles and reject unsafe URLs through validation', () => {
  const parsed = parseCsvBackup('title,url,tag,archived\n"A, useful page",https://example.com,work,no');
  assert.equal(parsed.tabs[0].title, 'A, useful page');
  assert.equal(validateBackup(parsed).tabs.length, 1);
  const unsafe = parseCsvBackup('title,url\nBad,javascript:alert(1)');
  assert.equal(validateBackup(unsafe).tabs.length, 0);
});

test('recurring reminders advance to the next future occurrence', () => {
  const base = 1000000;
  assert.deepEqual(advanceRecurringReminder({ id: 'r', remindAt: base, repeat: 'daily', status: 'pending' }, base + 2 * 86400000), {
    id: 'r', remindAt: base + 3 * 86400000, repeat: 'daily', status: 'pending', updatedAt: base + 2 * 86400000
  });
  assert.equal(advanceRecurringReminder({ remindAt: base, repeat: null, status: 'pending' }, base).status, 'completed');
});

test('reminder times must be finite and in the future', () => {
  assert.equal(isValidReminderTime(200, 100), true);
  assert.equal(isValidReminderTime(100, 100), false);
  assert.equal(isValidReminderTime('invalid', 100), false);
});

test('orphaned reminders are excluded from alarm data', () => {
  const result = filterRemindersForTabs([{ tabId: 'kept' }, { tabId: 'missing' }], [{ id: 'kept' }]);
  assert.deepEqual(result, [{ tabId: 'kept' }]);
});

test('settings normalization clamps unsafe values and removes invalid domains', () => {
  const settings = normalizeSettings({ retentionDays: -50, syncIntervalMinutes: 99999, theme: 'neon', blockedDomains: [' Example.COM ', 42, ''] });
  assert.equal(settings.retentionDays, 1);
  assert.equal(settings.syncIntervalMinutes, 1440);
  assert.equal(settings.theme, 'dark');
  assert.deepEqual(settings.blockedDomains, ['example.com']);
});

test('workspace normalization removes malformed records and duplicate tab ids', () => {
  const result = normalizeWorkspaces([{ id: 'w1', name: '  Focus  ', tabIds: ['a', 'a', '', 2] }, { id: '', tabIds: ['x'] }, null]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Focus');
  assert.deepEqual(result[0].tabIds, ['a', '2']);
});

test('retention cleanup keeps archived and reminded tabs', () => {
  const tabs = [
    { id: 'fresh', lastVisited: 200 },
    { id: 'old', lastVisited: 50 },
    { id: 'archived', lastVisited: 1, isArchived: true },
    { id: 'reminded', lastVisited: 1 },
  ];
  const retained = retainTabsByPolicy(tabs, [{ tabId: 'reminded', status: 'pending' }], 100);
  assert.deepEqual(retained.map(tab => tab.id), ['fresh', 'archived', 'reminded']);
});

test('OAuth callback validation requires the expected origin and path', () => {
  const expected = 'https://extension.chromiumapp.org/callback';
  assert.equal(isMatchingOAuthCallback(expected, `${expected}#access_token=token`), true);
  assert.equal(isMatchingOAuthCallback(expected, 'https://evil.example/callback#access_token=token'), false);
  assert.equal(isMatchingOAuthCallback(expected, 'https://extension.chromiumapp.org/other'), false);
});
