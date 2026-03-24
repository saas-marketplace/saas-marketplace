"use client";

import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

// Singleton lock manager to prevent race conditions
class AuthLockManager {
  private static instance: AuthLockManager;
  private authRequestInProgress = false;
  private authRequestPromise: Promise<any> | null = null;
  private lockTimeout: NodeJS.Timeout | null = null;
  private cachedSession: Session | null = null;
  private cachedUser: User | null = null;

  private constructor() {}

  static getInstance(): AuthLockManager {
    if (!AuthLockManager.instance) {
      AuthLockManager.instance = new AuthLockManager();
    }
    return AuthLockManager.instance;
  }

  private clearLock() {
    this.authRequestInProgress = false;
    this.authRequestPromise = null;
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }

  private setLock() {
    this.authRequestInProgress = true;
    // Clear lock after 10 seconds as a safety timeout
    this.lockTimeout = setTimeout(() => {
      console.warn('[AuthLockManager] Lock timeout - clearing');
      this.clearLock();
    }, 10000);
  }

  getSupabase() {
    return createClient();
  }

  /**
   * Safely get the session with lock protection and retry logic.
   * Prevents multiple concurrent requests to supabase.auth.getSession()
   */
  async getSession(): Promise<{ session: Session | null; error: Error | null }> {
    // Return cached session if available and not expired
    if (this.cachedSession?.expires_at) {
      const expiresAt = new Date(this.cachedSession.expires_at * 1000);
      if (expiresAt > new Date()) {
        return { session: this.cachedSession, error: null };
      }
    }

    // Wait for existing request to complete
    if (this.authRequestInProgress && this.authRequestPromise) {
      try {
        const result = await this.authRequestPromise;
        return result;
      } catch (error) {
        // If the existing request failed, we'll try our own request
        console.warn('[AuthLockManager] Waiting for existing request failed, trying own request');
      }
    }

    // Create new request with lock
    const makeRequest = async (): Promise<{ session: Session | null; error: Error | null }> => {
      const supabase = this.getSupabase();
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthLockManager] getSession error:', error);
          return { session: null, error };
        }

        this.cachedSession = data.session;
        this.cachedUser = data.session?.user ?? null;
        
        return { session: data.session, error: null };
      } catch (err: any) {
        // AbortError means the Supabase Web Lock was stolen by another request.
        // DO NOT retry — retrying immediately steals the lock back, aborting all
        // other waiters and creating a cascade of AbortErrors across the app.
        // Return cached session if we have one, otherwise return null gracefully.
        if (err.name === 'AbortError') {
          console.warn('[AuthLockManager] AbortError during getSession — returning cache or null (no retry)');
          return { session: this.cachedSession, error: null };
        }

        console.error('[AuthLockManager] getSession exception:', err);
        return { session: null, error: err };
      }
    };

    this.setLock();
    this.authRequestPromise = makeRequest();

    try {
      const result = await this.authRequestPromise;
      return result;
    } finally {
      this.clearLock();
    }
  }

  /**
   * Safely get the user with lock protection and retry logic.
   * Prevents multiple concurrent requests to supabase.auth.getUser()
   */
  async getUser(): Promise<{ user: User | null; error: Error | null }> {
    // Return cached user if available
    if (this.cachedUser) {
      return { user: this.cachedUser, error: null };
    }

    // Wait for existing request to complete
    if (this.authRequestInProgress && this.authRequestPromise) {
      try {
        const result = await this.authRequestPromise;
        // If the existing request got a session, extract user from it
        if (result.session?.user) {
          return { user: result.session.user, error: null };
        }
      } catch (error) {
        console.warn('[AuthLockManager] Waiting for existing request failed');
      }
    }

    // Create new request with lock
    const makeRequest = async (): Promise<{ user: User | null; error: Error | null }> => {
      const supabase = this.getSupabase();
      
      try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('[AuthLockManager] getUser error:', error);
          return { user: null, error };
        }

        this.cachedUser = data.user;
        
        return { user: data.user, error: null };
      } catch (err: any) {
        // AbortError means the Supabase Web Lock was stolen. Same rule as getSession:
        // no retry — return cached user if available, otherwise null.
        if (err.name === 'AbortError') {
          console.warn('[AuthLockManager] AbortError during getUser — returning cache or null (no retry)');
          return { user: this.cachedUser, error: null };
        }

        console.error('[AuthLockManager] getUser exception:', err);
        return { user: null, error: err };
      }
    };

    this.setLock();
    this.authRequestPromise = makeRequest();

    try {
      const result = await this.authRequestPromise;
      return result;
    } finally {
      this.clearLock();
    }
  }

  /**
   * Force refresh the session - useful for token refresh scenarios
   */
  async refreshSession(forceRefresh = false): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
    const supabase = this.getSupabase();
    
    try {
      // Clear cache when forcing refresh
      if (forceRefresh) {
        this.cachedSession = null;
        this.cachedUser = null;
      }

      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthLockManager] refreshSession error:', error);
        return { session: null, user: null, error };
      }

      this.cachedSession = data.session;
      this.cachedUser = data.session?.user ?? null;
      
      return { session: data.session, user: data.session?.user ?? null, error: null };
    } catch (err: any) {
      console.error('[AuthLockManager] refreshSession exception:', err);
      return { session: null, user: null, error: err };
    }
  }

  /**
   * Clear the cached session/user - call on sign out
   */
  clearCache() {
    this.cachedSession = null;
    this.cachedUser = null;
    this.clearLock();
  }

  /**
   * Get cached session without making a request
   */
  getCachedSession(): Session | null {
    return this.cachedSession;
  }

  /**
   * Get cached user without making a request
   */
  getCachedUser(): User | null {
    return this.cachedUser;
  }
}

// Export singleton instance
export const authLockManager = AuthLockManager.getInstance();

// Helper function to safely get session
export async function safeGetSession(): Promise<{ session: Session | null; error: Error | null }> {
  return authLockManager.getSession();
}

// Helper function to safely get user
export async function safeGetUser(): Promise<{ user: User | null; error: Error | null }> {
  return authLockManager.getUser();
}

// Helper function to safely refresh session
export async function safeRefreshSession(forceRefresh = false): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
  return authLockManager.refreshSession(forceRefresh);
}

// Helper to clear auth cache on sign out
export function clearAuthCache() {
  authLockManager.clearCache();
}

// ─── Password-change guard ────────────────────────────────────────────────────
// When the profile page does signInWithPassword → updateUser, Supabase fires
// SIGNED_IN between the two calls. If useSession re-fetches on that SIGNED_IN
// it acquires the Web Lock, making updateUser wait 5 s then get a 422.
// Set this flag true before signInWithPassword and false after updateUser
// resolves so useSession knows to skip the intervening SIGNED_IN re-fetch.
let _passwordChangeInProgress = false;

export function beginPasswordChange() {
  _passwordChangeInProgress = true;
}

export function endPasswordChange() {
  _passwordChangeInProgress = false;
}

export function isPasswordChangeInProgress(): boolean {
  return _passwordChangeInProgress;
}