/**
 * Centralized Service Layer
 * All database calls should go through these services
 * No Supabase queries directly in components or hooks
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

// Server-side client (for server components)
export function getServerSupabaseClient() {
  return createServerSupabaseClient();
}

// Browser-side client (for client components)
export function getBrowserSupabaseClient() {
  return createBrowserClient();
}

// Re-export all service modules
export * from './users';
export * from './freelancers';
export * from './products';
export * from './requests';
export * from './team';
export * from './permissions';
