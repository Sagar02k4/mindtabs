import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, isSafePageUrl, validateBackup, isBlockedDomain, encryptBackup, decryptBackup, parseCsvBackup } from '../src/utils/helpers.js';
import { getFuturePendingReminders, scheduleReminderAlarms, advanceRecurringReminder } from '../src/utils/reminders.js';

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

test('safe page validation rejects executable URL schemes', () => {
  assert.equal(isSafePageUrl('javascript:alert(1)'), false);
  assert.equal(isSafePageUrl('https://example.com/page'), true);
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
