export function retainTabsByPolicy(tabs, reminders, cutoff) {
  const reminderTabIds = new Set((Array.isArray(reminders) ? reminders : [])
    .filter(reminder => reminder.status === 'pending')
    .map(reminder => reminder.tabId));
  return (Array.isArray(tabs) ? tabs : []).filter(tab =>
    tab.isArchived || Number(tab.lastVisited || tab.createdAt) >= cutoff || reminderTabIds.has(tab.id)
  );
}
