import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Simple session getter - lets Supabase handle its own locking
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
 * Simple user getter - lets Supabase handle its own locking
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
 * Simple refresh - lets Supabase handle its own locking
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
 * Clear auth cache - no-op
 */
export function clearAuthCache() {
  // No-op
}

// For backward compatibility
export function isPasswordChangeInProgress(): boolean {
  return false;
}

export const authLockManager = {
  getCachedUser: (): User | null => null,
  getCachedSession: (): Session | null => null,
  clearCache: () => {},
};
