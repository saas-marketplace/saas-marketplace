/**
 * Users Service
 * Centralized database operations for users
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  is_banned?: boolean;
  full_name?: string;
  avatar_url?: string;
}

export interface UserWithProfile extends User {
  profile?: {
    full_name?: string;
    avatar_url?: string;
    bio?: string;
  };
}

/**
 * Get user by ID (server-side)
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[UsersService] getUserById error:', error);
    throw error;
  }

  return data as User | null;
}

/**
 * Get user role (server-side)
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[UsersService] getUserRole error:', error);
    return 'user';
  }

  return (data?.role as UserRole) || 'user';
}

/**
 * Get all users (server-side)
 */
export async function getUsers(options?: {
  limit?: number;
  offset?: number;
  role?: UserRole;
}): Promise<{ users: User[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const { limit = 50, offset = 0, role } = options || {};

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[UsersService] getUsers error:', error);
    throw error;
  }

  return { users: (data as User[]) || [], total: count || 0 };
}

/**
 * Update user role (server-side)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('[UsersService] updateUserRole error:', error);
    throw error;
  }
}

/**
 * Ban/unban user (server-side)
 */
export async function setUserBanned(userId: string, isBanned: boolean): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ is_banned: isBanned })
    .eq('id', userId);

  if (error) {
    console.error('[UsersService] setUserBanned error:', error);
    throw error;
  }
}

// ─── Client-side functions ───────────────────────────────────────────────

/**
 * Get user by ID (client-side)
 */
export async function getUserByIdClient(userId: string): Promise<User | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[UsersService] getUserByIdClient error:', error);
    throw error;
  }

  return data as User | null;
}

/**
 * Get current user (client-side)
 */
export async function getCurrentUserClient(): Promise<User | null> {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return getUserByIdClient(user.id);
}
