import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeLists, mergeTabs } from '../src/utils/merge.js';

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

test('tab merge resolves tag and archive fields independently', () => {
  const local = { id: 'same', title: 'Local', tag: 'work', isArchived: false, updatedAt: 200, tagUpdatedAt: 300, archiveUpdatedAt: 100, createdAt: 1 };
  const cloud = { id: 'same', title: 'Cloud', tag: 'research', isArchived: true, updatedAt: 250, tagUpdatedAt: 150, archiveUpdatedAt: 400, createdAt: 1 };
  const merged = mergeTabs(local, cloud);
  assert.equal(merged.title, 'Cloud');
  assert.equal(merged.tag, 'work');
  assert.equal(merged.isArchived, true);
  assert.equal(merged.updatedAt, 250);
});
