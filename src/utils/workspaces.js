export function normalizeWorkspaces(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map(workspace => ({
    id: String(workspace.id || ''),
    name: String(workspace.name || 'Untitled workspace').trim().slice(0, 100),
    tabIds: Array.isArray(workspace.tabIds) ? [...new Set(workspace.tabIds.map(String).filter(Boolean))].slice(0, 1000) : [],
    createdAt: Number(workspace.createdAt) || Date.now(),
    updatedAt: Number(workspace.updatedAt) || Number(workspace.createdAt) || Date.now(),
  })).filter(workspace => workspace.id && workspace.tabIds.length > 0);
}
