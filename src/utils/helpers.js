/**
 * Format a timestamp into a relative time string
 */
export function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date for display
 */
export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extract domain from URL
 */
export function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Treat tracking/query variants of the same page as one saved page.
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    const removable = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|source$)/i;
    [...u.searchParams.keys()].forEach((key) => {
      if (removable.test(key)) u.searchParams.delete(key);
    });
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return url;
  }
}

export function isSafePageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateBackup(data) {
  if (!data || !Array.isArray(data.tabs) || !Array.isArray(data.reminders)) {
    throw new Error('Invalid MindTabs backup format.');
  }
  if (data.tabs.length > 10000 || data.reminders.length > 10000) {
    throw new Error('Backup is too large.');
  }
  const tabs = data.tabs.filter(tab => tab && typeof tab === 'object' && isSafePageUrl(tab.url)).map(tab => ({
    ...tab,
    url: normalizeUrl(tab.url),
    title: String(tab.title || 'Untitled').slice(0, 500),
    tag: tab.tag ? String(tab.tag).slice(0, 100) : null,
  }));
  const tabIds = new Set(tabs.map(tab => String(tab.id)));
  const reminders = data.reminders.filter(reminder => reminder && typeof reminder === 'object' && tabIds.has(String(reminder.tabId)) && Number(reminder.remindAt) > 0);
  return { tabs, reminders };
}

const encodeBytes = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decodeBytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export async function encryptBackup(data, password) {
  if (!password || password.length < 8) throw new Error('Backup password must be at least 8 characters.');
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(data)));
  return { format: 'mindtabs-encrypted-backup', version: 1, algorithm: 'AES-GCM/PBKDF2-SHA256', salt: encodeBytes(salt), iv: encodeBytes(iv), ciphertext: encodeBytes(ciphertext) };
}

export async function decryptBackup(envelope, password) {
  if (!envelope || envelope.format !== 'mindtabs-encrypted-backup' || envelope.version !== 1) throw new Error('Unsupported encrypted backup format.');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: decodeBytes(envelope.salt), iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBytes(envelope.iv) }, key, decodeBytes(envelope.ciphertext));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Could not decrypt backup. Check the password.');
  }
}

export function parseCsvBackup(csv) {
  const lines = String(csv).trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV backup is empty.');
  const parseLine = line => {
    const values = []; let value = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { values.push(value); value = ''; }
      else value += char;
    }
    values.push(value);
    return values;
  };
  const headers = parseLine(lines[0]).map(header => header.trim().toLowerCase());
  const titleIndex = headers.indexOf('title'); const urlIndex = headers.indexOf('url');
  if (titleIndex < 0 || urlIndex < 0) throw new Error('CSV must contain title and url columns.');
  const tagIndex = headers.indexOf('tag'); const archivedIndex = headers.indexOf('archived');
  const tabs = lines.slice(1).filter(Boolean).map((line, index) => { const values = parseLine(line); const now = Date.now() + index; return { id: `csv-${now}-${index}`, title: values[titleIndex], url: values[urlIndex], tag: tagIndex >= 0 ? values[tagIndex] || null : null, isArchived: archivedIndex >= 0 && /^(yes|true|1)$/i.test(values[archivedIndex]), createdAt: now, lastVisited: now, updatedAt: now, tagUpdatedAt: now, archiveUpdatedAt: now }; });
  return { version: 1, tabs, reminders: [] };
}

/**
 * Get favicon URL for a given page URL
 */
export function getFaviconUrl(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return null;
  }
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getUserIdFromAccessToken(accessToken) {
  try {
    const payload = accessToken?.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
    return JSON.parse(atob(padded))?.sub || null;
  } catch {
    return null;
  }
}

/**
 * Truncate text to a max length
 */
export function truncateText(text, maxLength = 60) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Check if a URL should be excluded from tracking
 */
export function shouldExcludeUrl(url) {
  if (!url) return true;
  const excludedPatterns = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'edge://',
    'brave://',
    'devtools://',
    'chrome-search://',
  ];
  return excludedPatterns.some(pattern => url.startsWith(pattern));
}

export function isBlockedDomain(url, blockedDomains = []) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blockedDomains.some(domain => {
      const normalized = String(domain).trim().toLowerCase().replace(/^\.+/, '');
      return normalized && (hostname === normalized || hostname.endsWith(`.${normalized}`));
    });
  } catch {
    return true;
  }
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
