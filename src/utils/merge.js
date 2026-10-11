export function mergeLists(localList, cloudList, keyField, conflictResolver) {
  const map = new Map();
  for (const item of localList) map.set(item[keyField], item);
  for (const item of cloudList) {
    const key = item[keyField];
    map.set(key, map.has(key) ? conflictResolver(map.get(key), item) : item);
  }
  return Array.from(map.values());
}
