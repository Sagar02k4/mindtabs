export function getFuturePendingReminders(reminders, now = Date.now()) {
  return (Array.isArray(reminders) ? reminders : []).filter(reminder => reminder.status === 'pending' && Number(reminder.remindAt) > now);
}

export async function scheduleReminderAlarms(reminders, alarms, now = Date.now()) {
  if (!alarms?.create) return 0;
  const pending = getFuturePendingReminders(reminders, now);
  await Promise.all(pending.map(reminder => alarms.create(`reminder-${reminder.id}`, { when: reminder.remindAt })));
  return pending.length;
}
