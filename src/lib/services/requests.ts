/**
 * Requests Service
 * Centralized database operations for client requests
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export interface ClientRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  budget_min?: number;
  budget_max?: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
}

/**
 * Get all requests (server-side)
 */
export async function getRequests(options?: {
  limit?: number;
  offset?: number;
  status?: ClientRequest['status'];
  userId?: string;
}): Promise<{ requests: ClientRequest[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const { limit = 50, offset = 0, status, userId } = options || {};

  let query = supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[RequestsService] getRequests error:', error);
    throw error;
  }

  return { requests: (data as ClientRequest[]) || [], total: count || 0 };
}

/**
 * Get request by ID (server-side)
 */
export async function getRequestById(id: string): Promise<ClientRequest | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[RequestsService] getRequestById error:', error);
    throw error;
  }

  return data as ClientRequest | null;
}

/**
 * Get request count (server-side)
 */
export async function getRequestCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[RequestsService] getRequestCount error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Create request (server-side)
 */
export async function createRequest(request: Omit<ClientRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ClientRequest> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .select()
    .single();

  if (error) {
    console.error('[RequestsService] createRequest error:', error);
    throw error;
  }

  return data as ClientRequest;
}

/**
 * Update request (server-side)
 */
export async function updateRequest(id: string, updates: Partial<ClientRequest>): Promise<ClientRequest> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[RequestsService] updateRequest error:', error);
    throw error;
  }

  return data as ClientRequest;
}

/**
 * Get request messages (server-side)
 */
export async function getRequestMessages(requestId: string): Promise<RequestMessage[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('request_messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[RequestsService] getRequestMessages error:', error);
    throw error;
  }

  return (data as RequestMessage[]) || [];
}

/**
 * Add request message (server-side)
 */
export async function addRequestMessage(message: Omit<RequestMessage, 'id' | 'created_at'>): Promise<RequestMessage> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('request_messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    console.error('[RequestsService] addRequestMessage error:', error);
    throw error;
  }

  return data as RequestMessage;
}

// ─── Client-side functions ───────────────────────────────────────────────

/**
 * Get all requests (client-side)
 */
export async function getRequestsClient(options?: {
  limit?: number;
  offset?: number;
  status?: ClientRequest['status'];
}): Promise<{ requests: ClientRequest[]; total: number }> {
  const supabase = createBrowserClient();
  const { limit = 50, offset = 0, status } = options || {};

  let query = supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[RequestsService] getRequestsClient error:', error);
    throw error;
  }

  return { requests: (data as ClientRequest[]) || [], total: count || 0 };
}
