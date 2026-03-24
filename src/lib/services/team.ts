/**
 * Team Service
 * Centralized database operations for team members
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role_label: string;
  permissions: Record<string, string[]>;
  is_active: boolean;
  needs_access_restored: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all team members (server-side)
 */
export async function getTeamMembers(options?: {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}): Promise<{ members: TeamMember[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const { limit = 50, offset = 0, activeOnly = true } = options || {};

  let query = supabase
    .from('team_members')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[TeamService] getTeamMembers error:', error);
    throw error;
  }

  return { members: (data as TeamMember[]) || [], total: count || 0 };
}

/**
 * Get team member by ID (server-side)
 */
export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[TeamService] getTeamMemberById error:', error);
    throw error;
  }

  return data as TeamMember | null;
}

/**
 * Get team member by user ID (server-side)
 */
export async function getTeamMemberByUserId(userId: string): Promise<TeamMember | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[TeamService] getTeamMemberByUserId error:', error);
    throw error;
  }

  return data as TeamMember | null;
}

/**
 * Get team member count (server-side)
 */
export async function getTeamMemberCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[TeamService] getTeamMemberCount error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Create team member (server-side)
 */
export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<TeamMember> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('team_members')
    .insert(member)
    .select()
    .single();

  if (error) {
    console.error('[TeamService] createTeamMember error:', error);
    throw error;
  }

  return data as TeamMember;
}

/**
 * Update team member (server-side)
 */
export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[TeamService] updateTeamMember error:', error);
    throw error;
  }

  return data as TeamMember;
}

/**
 * Delete team member (server-side)
 */
export async function deleteTeamMember(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[TeamService] deleteTeamMember error:', error);
    throw error;
  }
}

/**
 * Restore team member access (server-side)
 */
export async function restoreTeamMemberAccess(userId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('team_members')
    .update({ is_active: true, needs_access_restored: false })
    .eq('user_id', userId);

  if (error) {
    console.error('[TeamService] restoreTeamMemberAccess error:', error);
    throw error;
  }
}

// ─── Client-side functions ───────────────────────────────────────────────

/**
 * Get all team members (client-side)
 */
export async function getTeamMembersClient(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ members: TeamMember[]; total: number }> {
  const supabase = createBrowserClient();
  const { limit = 50, offset = 0 } = options || {};

  const { data, error, count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[TeamService] getTeamMembersClient error:', error);
    throw error;
  }

  return { members: (data as TeamMember[]) || [], total: count || 0 };
}
