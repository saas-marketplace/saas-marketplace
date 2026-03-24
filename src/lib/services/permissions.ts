/**
 * Permissions Service
 * Centralized database operations for permissions
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export type PermissionSection = 
  | 'dashboard'
  | 'domains'
  | 'freelancers'
  | 'products'
  | 'blogs'
  | 'requests'
  | 'team'
  | 'users'
  | 'contact_submissions';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export type SectionPermissions = PermissionAction[];

export interface Permissions {
  dashboard: SectionPermissions;
  domains: SectionPermissions;
  freelancers: SectionPermissions;
  products: SectionPermissions;
  blogs: SectionPermissions;
  requests: SectionPermissions;
  team: SectionPermissions;
  users: SectionPermissions;
  contact_submissions: SectionPermissions;
}

// Default permissions for each role
export const DEFAULT_ADMIN_PERMISSIONS: Permissions = {
  dashboard: ['view'],
  domains: ['view', 'create', 'update', 'delete'],
  freelancers: ['view', 'create', 'update', 'delete'],
  products: ['view', 'create', 'update', 'delete'],
  blogs: ['view', 'create', 'update', 'delete'],
  requests: ['view', 'create', 'delete'],
  team: ['view', 'create', 'update', 'delete'],
  users: [],
  contact_submissions: [],
};

export const DEFAULT_SUPER_ADMIN_PERMISSIONS: Permissions = {
  dashboard: ['view'],
  domains: ['view', 'create', 'update', 'delete'],
  freelancers: ['view', 'create', 'update', 'delete'],
  products: ['view', 'create', 'update', 'delete'],
  blogs: ['view', 'create', 'update', 'delete'],
  requests: ['view', 'create', 'delete'],
  team: ['view', 'create', 'update', 'delete'],
  users: ['view', 'create', 'update', 'delete'],
  contact_submissions: ['view', 'create', 'delete'],
};

/**
 * Get user permissions (server-side)
 */
export async function getUserPermissions(userId: string, userRole: string): Promise<Permissions> {
  if (userRole === 'super_admin') {
    return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  }

  if (userRole !== 'admin') {
    return { dashboard: [], domains: [], freelancers: [], products: [], blogs: [], requests: [], team: [], users: [], contact_submissions: [] };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('permissions')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[PermissionsService] getUserPermissions error:', error);
    return DEFAULT_ADMIN_PERMISSIONS;
  }

  if (!data?.permissions) {
    return DEFAULT_ADMIN_PERMISSIONS;
  }

  const parsed = typeof data.permissions === 'string' 
    ? JSON.parse(data.permissions) 
    : data.permissions;

  return { ...DEFAULT_ADMIN_PERMISSIONS, ...parsed };
}

/**
 * Check if user has permission (server-side)
 */
export async function hasPermission(
  userId: string,
  userRole: string,
  section: PermissionSection,
  action: PermissionAction
): Promise<boolean> {
  if (userRole === 'super_admin') {
    return DEFAULT_SUPER_ADMIN_PERMISSIONS[section]?.includes(action) ?? false;
  }

  if (userRole !== 'admin') {
    return false;
  }

  const permissions = await getUserPermissions(userId, userRole);
  return permissions[section]?.includes(action) ?? false;
}

/**
 * Check if user can access section (server-side)
 */
export async function canAccessSection(
  userId: string,
  userRole: string,
  section: PermissionSection
): Promise<boolean> {
  return hasPermission(userId, userRole, section, 'view');
}

// ─── Client-side functions ───────────────────────────────────────────────

/**
 * Get user permissions (client-side)
 */
export async function getUserPermissionsClient(userId: string, userRole: string): Promise<Permissions> {
  if (userRole === 'super_admin') {
    return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  }

  if (userRole !== 'admin') {
    return { dashboard: [], domains: [], freelancers: [], products: [], blogs: [], requests: [], team: [], users: [], contact_submissions: [] };
  }

  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('permissions')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[PermissionsService] getUserPermissionsClient error:', error);
    return DEFAULT_ADMIN_PERMISSIONS;
  }

  if (!data?.permissions) {
    return DEFAULT_ADMIN_PERMISSIONS;
  }

  const parsed = typeof data.permissions === 'string' 
    ? JSON.parse(data.permissions) 
    : data.permissions;

  return { ...DEFAULT_ADMIN_PERMISSIONS, ...parsed };
}
