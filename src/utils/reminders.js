export function getFuturePendingReminders(reminders, now = Date.now()) {
  return (Array.isArray(reminders) ? reminders : []).filter(reminder => reminder.status === 'pending' && Number(reminder.remindAt) > now);
}

export function isValidReminderTime(remindAt, now = Date.now()) {
  const timestamp = Number(remindAt);
  return Number.isFinite(timestamp) && timestamp > now;
}

export function getNextReminderTime(reminder) {
  const base = Number(reminder?.remindAt);
  if (!Number.isFinite(base) || !['daily', 'weekly'].includes(reminder?.repeat)) return null;
  return base + (reminder.repeat === 'daily' ? 86400000 : 604800000);
}

export function advanceRecurringReminder(reminder, now = Date.now()) {
  const next = getNextReminderTime(reminder);
  if (!next) return { ...reminder, status: 'completed', updatedAt: now };
  const interval = next - Number(reminder.remindAt);
  let remindAt = next;
  while (remindAt <= now) remindAt += interval;
  return { ...reminder, status: 'pending', remindAt, updatedAt: now };
}

export async function scheduleReminderAlarms(reminders, alarms, now = Date.now()) {
  if (!alarms?.create) return 0;
  if (alarms.getAll && alarms.clear) {
    const existing = await alarms.getAll();
    await Promise.all((existing || [])
      .filter(alarm => alarm.name?.startsWith('reminder-'))
      .map(alarm => alarms.clear(alarm.name)));
  }
  const pending = getFuturePendingReminders(reminders, now);
  await Promise.all(pending.map(reminder => alarms.create(`reminder-${reminder.id}`, { when: reminder.remindAt })));
  return pending.length;
}
