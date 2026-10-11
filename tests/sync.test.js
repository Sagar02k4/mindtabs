import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeLists } from '../src/utils/merge.js';

test('mergeLists keeps unique local and cloud records', () => {
  const result = mergeLists(
    [{ id: 'local', value: 1 }],
    [{ id: 'cloud', value: 2 }],
    'id',
    (local) => local
  );
  assert.deepEqual(result, [{ id: 'local', value: 1 }, { id: 'cloud', value: 2 }]);
});

test('mergeLists uses the conflict resolver for matching records', () => {
  const result = mergeLists(
    [{ id: 'same', value: 'local' }],
    [{ id: 'same', value: 'cloud' }],
    'id',
    (_local, cloud) => cloud
  );
  assert.deepEqual(result, [{ id: 'same', value: 'cloud' }]);
});
