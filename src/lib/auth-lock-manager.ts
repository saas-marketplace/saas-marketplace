import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

// Simple session/user getters without complex locking
// The complex locking was causing race conditions with password changes

/**
 * Get current session - simple wrapper
 */
export async function safeGetSession(): Promise<{ session: Session | null; error: Error | null }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (err: any) {
    console.error('[safeGetSession] error:', err);
    return { session: null, error: err };
  }
}

/**
 * Get current user - simple wrapper
 */
export async function safeGetUser(): Promise<{ user: User | null; error: Error | null }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  } catch (err: any) {
    console.error('[safeGetUser] error:', err);
    return { user: null, error: err };
  }
}

/**
 * Refresh session - simple wrapper
 */
export async function safeRefreshSession(): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, user: data.session?.user ?? null, error };
  } catch (err: any) {
    console.error('[safeRefreshSession] error:', err);
    return { session: null, user: null, error: err };
  }
}

/**
 * Clear auth cache - no-op since we don't cache anymore
 */
export function clearAuthCache() {
  // No-op - keeping for API compatibility
  console.log('[clearAuthCache] called (no-op)');
}

// Re-export isPasswordChanging from auth-provider for compatibility
// This is now handled in AuthProvider, so this is a stub for backward compatibility
export function isPasswordChangeInProgress(): boolean {
  return false;
}

// Simple authLockManager for backward compatibility
// The complex locking was causing MORE issues than solving
export const authLockManager = {
  getCachedUser: (): User | null => null,
  getCachedSession: (): Session | null => null,
  clearCache: () => {},
};
