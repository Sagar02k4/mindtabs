import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,    // We manage session in chrome.storage ourselves
    detectSessionInUrl: false, // Not applicable in extension context
  },
});

/**
 * Check if Supabase is properly configured (not using placeholder values)
 */
export function isSupabaseConfigured() {
  return (
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY.length > 0
  );
}

export { SUPABASE_URL };
