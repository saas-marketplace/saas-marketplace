/**
 * Freelancers Service
 * Centralized database operations for freelancers
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export interface Freelancer {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  hourly_rate: number;
  skills: string[];
  portfolio_url?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all freelancers (server-side)
 */
export async function getFreelancers(options?: {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}): Promise<{ freelancers: Freelancer[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const { limit = 50, offset = 0, activeOnly = true } = options || {};

  let query = supabase
    .from('freelancers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[FreelancersService] getFreelancers error:', error);
    throw error;
  }

  return { freelancers: (data as Freelancer[]) || [], total: count || 0 };
}

/**
 * Get freelancer by ID (server-side)
 */
export async function getFreelancerById(id: string): Promise<Freelancer | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('freelancers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[FreelancersService] getFreelancerById error:', error);
    throw error;
  }

  return data as Freelancer | null;
}

/**
 * Get freelancer by slug (server-side)
 */
export async function getFreelancerBySlug(slug: string): Promise<Freelancer | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('freelancers')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[FreelancersService] getFreelancerBySlug error:', error);
    throw error;
  }

  return data as Freelancer | null;
}

/**
 * Get freelancer count (server-side)
 */
export async function getFreelancerCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from('freelancers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[FreelancersService] getFreelancerCount error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Create freelancer (server-side)
 */
export async function createFreelancer(freelancer: Omit<Freelancer, 'id' | 'created_at' | 'updated_at'>): Promise<Freelancer> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('freelancers')
    .insert(freelancer)
    .select()
    .single();

  if (error) {
    console.error('[FreelancersService] createFreelancer error:', error);
    throw error;
  }

  return data as Freelancer;
}

/**
 * Update freelancer (server-side)
 */
export async function updateFreelancer(id: string, updates: Partial<Freelancer>): Promise<Freelancer> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('freelancers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[FreelancersService] updateFreelancer error:', error);
    throw error;
  }

  return data as Freelancer;
}

/**
 * Delete freelancer (server-side)
 */
export async function deleteFreelancer(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('freelancers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[FreelancersService] deleteFreelancer error:', error);
    throw error;
  }
}

// ─── Client-side functions ───────────────────────────────────────────────

/**
 * Get all freelancers (client-side)
 */
export async function getFreelancersClient(options?: {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}): Promise<{ freelancers: Freelancer[]; total: number }> {
  const supabase = createBrowserClient();
  const { limit = 50, offset = 0, activeOnly = true } = options || {};

  let query = supabase
    .from('freelancers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[FreelancersService] getFreelancersClient error:', error);
    throw error;
  }

  return { freelancers: (data as Freelancer[]) || [], total: count || 0 };
}
