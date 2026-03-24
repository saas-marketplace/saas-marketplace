"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import type { PermissionSection, PermissionAction, SectionPermissions } from '@/types/permissions';

interface PermissionsContextType {
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isRemoved: boolean;
  isSuspended: boolean;
  permissions: Record<PermissionSection, SectionPermissions>;
  accessibleSections: PermissionSection[];
  hasPermission: (section: PermissionSection, action: PermissionAction) => boolean;
  canAccessSection: (section: PermissionSection) => boolean;
  canCreate: (section: PermissionSection) => boolean;
  canUpdate: (section: PermissionSection) => boolean;
  canDelete: (section: PermissionSection) => boolean;
  all: Record<string, string[]>;
  checkStatus: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // CRITICAL: Use centralized user from AuthProvider to prevent duplicate /auth/v1/user calls
  const { user: authUser, loading: authLoading } = useAuth();
  const supabase = createClient();
  
  const [state, setState] = useState<{
    isLoading: boolean;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isRemoved: boolean;
    isSuspended: boolean;
    permissions: Record<PermissionSection, SectionPermissions>;
    accessibleSections: PermissionSection[];
  }>({
    isLoading: true,
    isSuperAdmin: false,
    isAdmin: false,
    isRemoved: false,
    isSuspended: false,
    permissions: {} as Record<PermissionSection, SectionPermissions>,
    accessibleSections: [],
  });

  const isFetchingRef = useRef(false);
  const fetchedRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const fetchPermissions = useCallback(async (user: any) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      // Single parallel fetch: users.role + team_members
      const [userResult, teamResult] = await Promise.all([
        supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('team_members').select('permissions, is_active, needs_access_restored').eq('user_id', user.id).maybeSingle(),
      ]);

      const userRole = userResult.data?.role || 'user';
      const teamMember = teamResult.data;

      console.log('[PermissionsProvider] Role:', userRole, 'Team:', teamMember);

      if (userRole === 'super_admin') {
        const fullPerms: Record<PermissionSection, SectionPermissions> = {
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
        if (mountedRef.current) {
          setState({
            isLoading: false,
            isSuperAdmin: true,
            isAdmin: true,
            isRemoved: false,
            isSuspended: false,
            permissions: fullPerms,
            accessibleSections: Object.keys(fullPerms) as PermissionSection[],
          });
        }
        return;
      }

      if (userRole !== 'admin') {
        if (mountedRef.current) {
          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: false,
            isRemoved: false,
            isSuspended: false,
            permissions: {} as Record<PermissionSection, SectionPermissions>,
            accessibleSections: [],
          });
        }
        return;
      }

      // Admin: check team_member
      const isRemovedState = !teamMember;
      const isSuspendedState = teamMember && teamMember.is_active === false;
      const needsRestore = teamMember?.needs_access_restored || false;

      if (mountedRef.current) {
        let permissionsData: Record<PermissionSection, SectionPermissions> = {
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

        if (teamMember?.permissions) {
          const parsed = typeof teamMember.permissions === 'string' 
            ? JSON.parse(teamMember.permissions) 
            : teamMember.permissions;
          permissionsData = { ...permissionsData, ...parsed };
        }

        const sections = (Object.keys(permissionsData) as PermissionSection[]).filter(
          section => Array.isArray(permissionsData[section]) && permissionsData[section].includes('view')
        );

        setState({
          isLoading: false,
          isSuperAdmin: false,
          isAdmin: true,
          isRemoved: isRemovedState,
          isSuspended: isSuspendedState,
          permissions: permissionsData,
          accessibleSections: sections,
        });

        // One-time restore clear
        if (needsRestore && teamMember) {
          await supabase.from('team_members').update({ needs_access_restored: false }).eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('[PermissionsProvider] Error:', error);
      if (mountedRef.current) {
        setState({
          isLoading: false,
          isSuperAdmin: false,
          isAdmin: false,
          isRemoved: false,
          isSuspended: false,
          permissions: {} as Record<PermissionSection, SectionPermissions>,
          accessibleSections: [],
        });
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [supabase]);

  // Primary effect: Sync with AuthProvider user (NO duplicate auth calls)
  useEffect(() => {
    mountedRef.current = true;
    
    // Wait for auth to finish loading
    if (authLoading) {
      setState(prev => ({ ...prev, isLoading: true }));
      return;
    }
    
    const user = authUser;
    if (!user) {
      if (mountedRef.current) {
        setState({
          isLoading: false,
          isSuperAdmin: false,
          isAdmin: false,
          isRemoved: false,
          isSuspended: false,
          permissions: {} as Record<PermissionSection, SectionPermissions>,
          accessibleSections: [],
        });
      }
      return;
    }
    
    // User exists from AuthProvider - fetch permissions once
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPermissions(user);
    }
  }, [authUser, authLoading, fetchPermissions]);

  // Setup realtime subscription for team_members changes
  useEffect(() => {
    if (!authUser?.id) return;
    
    const channel = supabase.channel('permissions_provider')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'team_members', 
          filter: `user_id=eq.${authUser.id}` 
        },
        () => fetchPermissions(authUser)
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current && typeof realtimeChannelRef.current.unsubscribe === 'function') {
        realtimeChannelRef.current.unsubscribe();
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [authUser?.id, supabase, fetchPermissions]);

  const hasPermission = useCallback((section: PermissionSection, action: PermissionAction): boolean => {
    if (state.isSuperAdmin) return true;
    if (!state.isAdmin) return false;
    const sectionPermissions = state.permissions[section];
    return Array.isArray(sectionPermissions) && sectionPermissions.includes(action);
  }, [state.isSuperAdmin, state.isAdmin, state.permissions]);

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

  const checkStatus = useCallback(async () => {
    if (authUser) {
      fetchedRef.current = false;
      await fetchPermissions(authUser);
    }
  }, [authUser, fetchPermissions]);

  // Combine auth loading state with permissions loading
  const isLoading = authLoading || state.isLoading;

  // Direct access to all permissions
  const all = {
    domains: state.permissions.domains || [],
    blogs: state.permissions.blogs || [],
    freelancers: state.permissions.freelancers || [],
    products: state.permissions.products || [],
    requests: state.permissions.requests || [],
    team: state.permissions.team || [],
    dashboard: state.permissions.dashboard || [],
    users: state.permissions.users || [],
    contact_submissions: state.permissions.contact_submissions || [],
  };

  return (
    <PermissionsContext.Provider value={{
      ...state,
      isLoading,
      hasPermission,
      canAccessSection,
      canCreate,
      canUpdate,
      canDelete,
      all,
      checkStatus,
    }}>
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
