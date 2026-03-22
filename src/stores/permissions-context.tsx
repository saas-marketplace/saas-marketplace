"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Permissions, PermissionSection, PermissionAction } from '@/types/permissions';

interface PermissionsContextType {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  permissions: Permissions;
  accessibleSections: PermissionSection[];
  hasPermission: (section: PermissionSection, action: PermissionAction) => boolean;
  canAccessSection: (section: PermissionSection) => boolean;
  canCreate: (section: PermissionSection) => boolean;
  canUpdate: (section: PermissionSection) => boolean;
  canDelete: (section: PermissionSection) => boolean;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [accessibleSections, setAccessibleSections] = useState<PermissionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);
  const supabase = createClient();

  const fetchPermissions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setPermissions({});
      setAccessibleSections([]);
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'user';
    console.log('[PermissionsContext] User role:', userRole, 'User ID:', user.id);

    if (userRole === 'super_admin') {
      setIsSuperAdmin(true);
      setIsAdmin(true);
      const fullPerms: Permissions = {
        dashboard: ['view'] as const,
        domains: ['view', 'create', 'update', 'delete'] as const,
        freelancers: ['view', 'create', 'update', 'delete'] as const,
        products: ['view', 'create', 'update', 'delete'] as const,
        blogs: ['view', 'create', 'update', 'delete'] as const,
        requests: ['view', 'create', 'delete'] as const,
        team: ['view', 'create', 'update', 'delete'] as const,
      };
      setPermissions(fullPerms);
      setAccessibleSections(['dashboard', 'domains', 'freelancers', 'products', 'blogs', 'requests', 'team']);
      console.log('[PermissionsContext] Super admin - full access granted');
    } else if (userRole === 'admin') {
      setIsAdmin(true);
      const { data: teamMember, error } = await supabase
        .from('team_members')
        .select('permissions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      console.log('[PermissionsContext] Team member:', teamMember, 'Error:', error);

      let perms: Permissions;
      if (teamMember?.permissions) {
        perms = typeof teamMember.permissions === 'string' ? JSON.parse(teamMember.permissions) : teamMember.permissions;
      } else {
        // FIXED: Defaults now include dashboard:view
        perms = {
          dashboard: ['view'] as const,
          domains: ['view', 'create', 'update', 'delete'] as const,
          freelancers: ['view', 'create', 'update', 'delete'] as const,
          products: ['view', 'create', 'update', 'delete'] as const,
          blogs: ['view', 'create', 'update', 'delete'] as const,
          requests: ['view', 'create', 'delete'] as const,
          team: ['view', 'create', 'update', 'delete'] as const,
        };
      }
      setPermissions(perms);
      const sections = (Object.keys(perms) as PermissionSection[]).filter(section =>
        Array.isArray(perms[section]) && perms[section].includes('view')
      );
      setAccessibleSections(sections);
      console.log('[PermissionsContext] Admin permissions:', perms);
      console.log('[PermissionsContext] Accessible sections:', sections);
      console.log('[PermissionsContext] Can dashboard:', perms.dashboard?.includes('view') || false);
    } else {
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setPermissions({});
      setAccessibleSections([]);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPermissions();
    }

    // Listen for auth state changes to refresh permissions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      console.log('[PermissionsContext] Auth state changed:', event);
      if (event === 'SIGNED_OUT') {
        // Clear all state on logout
        setIsSuperAdmin(false);
        setIsAdmin(false);
        setPermissions({});
        setAccessibleSections([]);
        setIsLoading(false);
        fetchedRef.current = false;
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh permissions on login or token refresh
        fetchedRef.current = false;
        await fetchPermissions();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPermissions, supabase.auth]);

  const hasPermission = (section: PermissionSection, action: PermissionAction): boolean => {
    if (isSuperAdmin) {
      console.log(`[PermissionsContext] SuperAdmin bypass: ${section}:${action}`);
      return true;
    }
    const sectionPerms = permissions[section] || [];
    const allowed = Array.isArray(sectionPerms) && sectionPerms.includes(action);
    if (section === 'dashboard' && action === 'view') {
      console.log(`[PermissionsContext] Dashboard access check: ${allowed}, perms:`, sectionPerms);
    }
    return allowed;
  };

  const canAccessSection = (section: PermissionSection): boolean => hasPermission(section, 'view');
  const canCreate = (section: PermissionSection): boolean => hasPermission(section, 'create');
  const canUpdate = (section: PermissionSection): boolean => hasPermission(section, 'update');
  const canDelete = (section: PermissionSection): boolean => hasPermission(section, 'delete');

  const value = {
    isSuperAdmin,
    isAdmin,
    permissions,
    accessibleSections,
    hasPermission,
    canAccessSection,
    canCreate,
    canUpdate,
    canDelete,
    isLoading,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
