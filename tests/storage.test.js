import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from '../src/utils/constants.js';

test('clearAllStorage removes only MindTabs-owned Chrome storage keys', async () => {
  const calls = [];
  globalThis.chrome = {
    storage: { local: { remove(keys, callback) { calls.push(keys); callback(); } } },
    runtime: {},
  };
  const module = await import(`../src/utils/storage.js?storage-test=${Date.now()}`);
  await module.clearAllStorage();
  assert.deepEqual(calls, [Object.values(STORAGE_KEYS)]);
  delete globalThis.chrome;
});

test('local storage write failures propagate to callers', async () => {
  globalThis.localStorage = {
    setItem() { throw new Error('quota exceeded'); },
  };
  const module = await import(`../src/utils/storage.js?fallback-test=${Date.now()}`);
  await assert.rejects(() => module.setToStorage('mindtabs_test', { value: true }), /quota exceeded/);
  delete globalThis.localStorage;
});

test('multi-key local saves roll back when the second write fails', async () => {
  const values = new Map([['mindtabs_tabs', 'old-tabs'], ['mindtabs_reminders', 'old-reminders']]);
  let writes = 0;
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      writes += 1;
      if (writes === 2) throw new Error('quota exceeded');
      values.set(key, value);
    },
    removeItem(key) { values.delete(key); },
  };
  const module = await import(`../src/utils/storage.js?rollback-test=${Date.now()}`);
  await assert.rejects(() => module.saveData([{ id: 'new' }], [{ id: 'new-reminder' }]), /quota exceeded/);
  assert.equal(values.get('mindtabs_tabs'), 'old-tabs');
  assert.equal(values.get('mindtabs_reminders'), 'old-reminders');
  delete globalThis.localStorage;
});

test('saveTabs enforces safe URLs and favicon sanitization at the write boundary', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const module = await import(`../src/utils/storage.js?save-tabs-test=${Date.now()}`);
  await module.saveTabs([
    { id: 'safe', url: 'https://example.com/page/', favicon: 'javascript:bad' },
    { id: 'unsafe', url: 'javascript:alert(1)' },
  ]);
  assert.deepEqual(JSON.parse(values.get('mindtabs_tabs')), [{ id: 'safe', url: 'https://example.com/page', favicon: null }]);
  delete globalThis.localStorage;
});

test('saveReminders enforces reminder invariants at the write boundary', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const module = await import(`../src/utils/storage.js?save-reminders-test=${Date.now()}`);
  await module.saveReminders([
    { id: 'valid', tabId: 7, remindAt: '200', status: 'invalid', repeat: 'monthly' },
    { id: 'invalid', tabId: '7', remindAt: 0 },
  ]);
  assert.deepEqual(JSON.parse(values.get('mindtabs_reminders')), [{ id: 'valid', tabId: '7', remindAt: 200, status: 'pending', repeat: null }]);
  delete globalThis.localStorage;
});
