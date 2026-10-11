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
