import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl } from '../src/utils/helpers.js';

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
