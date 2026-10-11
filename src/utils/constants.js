// Storage keys
export const STORAGE_KEYS = {
  TABS: 'mindtabs_tabs',
  REMINDERS: 'mindtabs_reminders',
  SETTINGS: 'mindtabs_settings',
  SCHEMA_VERSION: 'mindtabs_schema_version',
};
export const STORAGE_SCHEMA_VERSION = 2;

// Tag options
export const TAG_OPTIONS = [
  { id: 'read-later', label: 'Read Later', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'work', label: 'Work', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'shopping', label: 'Shopping', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'research', label: 'Research', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { id: 'entertainment', label: 'Entertainment', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'important', label: 'Important', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
];

// Reminder presets
export const REMINDER_PRESETS = [
  { id: 'tomorrow', label: 'Tomorrow', icon: '☀️', getTime: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  }},
  { id: 'weekend', label: 'Weekend', icon: '🌴', getTime: () => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSaturday);
    d.setHours(10, 0, 0, 0);
    return d.getTime();
  }},
  { id: 'next-week', label: 'Next Week', icon: '📅', getTime: () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  }},
  { id: 'custom', label: 'Custom', icon: '⏰', getTime: () => null },
];

// Sort options
export const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'title', label: 'By Title' },
];

// URLs to exclude from tracking
export const EXCLUDED_URL_PATTERNS = [
  'chrome://',
  'chrome-extension://',
  'about:',
  'edge://',
  'brave://',
  'devtools://',
];

// Free tier limits
export const FREE_LIMITS = {
  MAX_TABS: 100,
  MAX_REMINDERS: 5,
};

export const CLEANUP_ALARM = 'weekly-cleanup';
export const CLEANUP_AFTER_DAYS = 90;
