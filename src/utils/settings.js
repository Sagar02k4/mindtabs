import { normalizeBlockedDomain } from './helpers.js';

export function normalizeSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const retentionDays = Number(raw.retentionDays);
  const syncIntervalMinutes = Number(raw.syncIntervalMinutes);
  return {
    theme: raw.theme === 'light' ? 'light' : 'dark',
    notifications: raw.notifications !== false,
    tracking: raw.tracking === true,
    onboardingComplete: raw.onboardingComplete === true,
    retentionDays: Number.isFinite(retentionDays) ? Math.min(3650, Math.max(1, Math.round(retentionDays))) : 90,
    syncIntervalMinutes: Number.isFinite(syncIntervalMinutes) ? Math.min(1440, Math.max(1, Math.round(syncIntervalMinutes))) : 5,
    blockedDomains: Array.isArray(raw.blockedDomains)
      ? raw.blockedDomains.filter(domain => typeof domain === 'string').map(normalizeBlockedDomain).filter(Boolean).slice(0, 100)
      : ['銀行', 'bank', 'mail.google.com'],
  };
}
