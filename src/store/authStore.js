import { create } from 'zustand';
import { supabase, isSupabaseConfigured, SUPABASE_URL } from '../utils/supabase';
import { getFromStorage, setToStorage, removeFromStorage } from '../utils/storage';

const AUTH_SESSION_KEY = 'mindtabs_auth_session';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  error: null,

  /**
   * Restore session from chrome.storage on startup
   */
  restoreSession: async () => {
    if (!isSupabaseConfigured()) {
      set({ loading: false });
      return;
    }

    try {
      const savedSession = await getFromStorage(AUTH_SESSION_KEY);
      if (savedSession) {
        // Try to refresh the session
        const { data, error } = await supabase.auth.setSession({
          access_token: savedSession.access_token,
          refresh_token: savedSession.refresh_token,
        });

        if (data?.session) {
          await setToStorage(AUTH_SESSION_KEY, {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          set({
            user: data.session.user,
            session: data.session,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return;
        }

        if (error) {
          // Session expired, clear it
          await removeFromStorage(AUTH_SESSION_KEY);
        }
      }
    } catch (err) {
      console.error('Session restore error:', err);
    }

    set({ loading: false });
  },

  /**
   * Sign in with Google via chrome.identity
   */
  signInWithGoogle: async () => {
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase is not configured. Please add your project URL and anon key.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Build the OAuth URL manually
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

      // Launch the web auth flow
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          (url) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(url);
            }
          }
        );
      });

      // Extract tokens from the URL fragment
      const hashParams = new URLSearchParams(
        responseUrl.split('#')[1] || responseUrl.split('?')[1] || ''
      );
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        throw new Error('No access token received from Google login.');
      }

      // Set the session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      // Persist session
      await setToStorage(AUTH_SESSION_KEY, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      set({
        user: data.session.user,
        session: data.session,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Google sign-in error:', err);
      set({ loading: false, error: err.message });
    }
  },

  /**
   * Sign in with email + password
   */
  signInWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase is not configured.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      await setToStorage(AUTH_SESSION_KEY, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      set({
        user: data.session.user,
        session: data.session,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /**
   * Sign up with email + password
   */
  signUpWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase is not configured.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        await setToStorage(AUTH_SESSION_KEY, {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        set({
          user: data.session.user,
          session: data.session,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
      } else {
        // Email confirmation required
        set({
          loading: false,
          error: null,
        });
        return { confirmationRequired: true };
      }
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    set({ loading: true });

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }

    await removeFromStorage(AUTH_SESSION_KEY);

    set({
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
  },

  /**
   * Reset Password for Email
   */
  resetPasswordForEmail: async (email) => {
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase is not configured.' });
      return { error: 'Supabase is not configured.' };
    }

    set({ loading: true, error: null });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: chrome.identity.getRedirectURL(),
      });

      if (error) throw error;
      
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { error: err.message };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
