"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
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
  // NEW: Direct permission access for efficiency - no function calls needed
  all: {
    domains: PermissionAction[];
    blogs: PermissionAction[];
    freelancers: PermissionAction[];
    products: PermissionAction[];
    requests: PermissionAction[];
    team: PermissionAction[];
    dashboard: PermissionAction[];
  };
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // CRITICAL: Use centralized user from AuthProvider to prevent duplicate /auth/v1/user calls
  // This eliminates the request spam caused by multiple components calling getUser()
  const { user: authUser, loading: authLoading } = useAuth();
  
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [accessibleSections, setAccessibleSections] = useState<PermissionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);
  const supabase = createClient();

  // Fetch permissions using user from AuthProvider - NO duplicate auth calls
  const fetchPermissions = useCallback(async () => {
    const user = authUser;
    
    if (!user) {
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setPermissions({});
      setAccessibleSections([]);
      setIsLoading(false);
      return;
    }

    try {
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
      } else {
        setIsSuperAdmin(false);
        setIsAdmin(false);
        setPermissions({});
        setAccessibleSections([]);
      }
    } catch (error) {
      console.error('[PermissionsContext] Error:', error);
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setPermissions({});
      setAccessibleSections([]);
    }
    setIsLoading(false);
  }, [supabase, authUser]);

  // Primary effect: Sync with AuthProvider user (NO duplicate auth calls)
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    
    // Fetch once when user is available
    if (authUser && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchPermissions();
    } else if (!authUser) {
      // No user - clear state
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setPermissions({});
      setAccessibleSections([]);
      setIsLoading(false);
      fetchedRef.current = false;
    }
  }, [authUser, authLoading, fetchPermissions]);

  // Listen for auth state changes to refresh permissions when needed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      console.log('[PermissionsContext] Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // AuthProvider already has the user, but we need to refetch permissions
        fetchedRef.current = false;
        fetchPermissions();
      } else if (event === 'SIGNED_OUT') {
        // Clear all state on logout
        setIsSuperAdmin(false);
        setIsAdmin(false);
        setPermissions({});
        setAccessibleSections([]);
        setIsLoading(false);
        fetchedRef.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchPermissions]);

  const hasPermission = useCallback((section: PermissionSection, action: PermissionAction): boolean => {
    if (isSuperAdmin) {
      return true;
    }
    const sectionPerms = permissions[section] || [];
    return Array.isArray(sectionPerms) && sectionPerms.includes(action);
  }, [isSuperAdmin, permissions]);

  const canAccessSection = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'view');
  }, [hasPermission]);

  const canCreate = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'create');
  }, [hasPermission]);

  const canUpdate = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'update');
  }, [hasPermission]);

  const canDelete = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'delete');
  }, [hasPermission]);

  const refreshPermissions = useCallback(async () => {
    fetchedRef.current = false;
    await fetchPermissions();
  }, [fetchPermissions]);

  // Combine auth loading with permissions loading
  const combinedLoading = authLoading || isLoading;

  // NEW: Direct permission access - computed once, no function calls needed
  const all = useMemo(() => ({
    domains: permissions.domains || [],
    blogs: permissions.blogs || [],
    freelancers: permissions.freelancers || [],
    products: permissions.products || [],
    requests: permissions.requests || [],
    team: permissions.team || [],
    dashboard: permissions.dashboard || [],
  }), [permissions]);

  const value: PermissionsContextType = {
    isSuperAdmin,
    isAdmin,
    permissions,
    accessibleSections,
    hasPermission,
    canAccessSection,
    canCreate,
    canUpdate,
    canDelete,
    isLoading: combinedLoading,
    refreshPermissions,
    all, // NEW: Direct permission access
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
