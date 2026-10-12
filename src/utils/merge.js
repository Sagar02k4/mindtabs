export function mergeLists(localList, cloudList, keyField, conflictResolver) {
  const map = new Map();
  for (const item of localList) map.set(item[keyField], item);
  for (const item of cloudList) {
    const key = item[keyField];
    map.set(key, map.has(key) ? conflictResolver(map.get(key), item) : item);
  }
  return Array.from(map.values());
}

export function mergeTabs(local, cloud) {
  const localUpdated = local.updatedAt || local.createdAt;
  const cloudUpdated = cloud.updatedAt || cloud.createdAt;
  return {
    ...(localUpdated >= cloudUpdated ? local : cloud),
    tag: (local.tagUpdatedAt || localUpdated) >= (cloud.tagUpdatedAt || cloudUpdated) ? local.tag : cloud.tag,
    isArchived: (local.archiveUpdatedAt || localUpdated) >= (cloud.archiveUpdatedAt || cloudUpdated) ? Boolean(local.isArchived) : Boolean(cloud.isArchived),
    tagUpdatedAt: Math.max(local.tagUpdatedAt || 0, cloud.tagUpdatedAt || 0),
    archiveUpdatedAt: Math.max(local.archiveUpdatedAt || 0, cloud.archiveUpdatedAt || 0),
    updatedAt: Math.max(localUpdated, cloudUpdated),
  };
}
