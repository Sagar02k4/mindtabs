import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Check if Supabase is properly configured (not using placeholder values)
 */
export function isSupabaseConfigured() {
  try {
    const url = new URL(SUPABASE_URL);
    return url.protocol === 'https:' && Boolean(url.hostname) && SUPABASE_ANON_KEY.length >= 20 && !/your_|placeholder|example\.com/i.test(SUPABASE_ANON_KEY);
  } catch {
    return false;
  }
}

export { SUPABASE_URL };
