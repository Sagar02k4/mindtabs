import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, isSafePageUrl, validateBackup, isBlockedDomain } from '../src/utils/helpers.js';

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
