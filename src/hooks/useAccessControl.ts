"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PermissionSection, PermissionAction, SectionPermissions } from '@/types/permissions';

interface AccessControlState {
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isRemoved: boolean;
  isSuspended: boolean;
  permissions: Record<PermissionSection, SectionPermissions>;
}

let previousStateRef: Partial<AccessControlState> = {};

export function useAccessControl() {
  const [state, setState] = useState<AccessControlState>({
    isLoading: true,
    isSuperAdmin: false,
    isAdmin: false,
    isRemoved: false,
    isSuspended: false,
    permissions: {} as Record<PermissionSection, SectionPermissions>,
  });
  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);
  const fetchedRef = useRef(false);
  const supabase = createClient();

  const fetchPermissions = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted.current) {
          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: false,
            isRemoved: false,
            isSuspended: false,
            permissions: {} as Record<PermissionSection, SectionPermissions>,
          });
        }
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = userData?.role || 'user';
      console.log('[AccessControl] User role:', userRole, 'User ID:', user.id);

      if (userRole === 'super_admin') {
        console.log('[AccessControl] User is super_admin - granting full permissions');
        if (isMounted.current) {
          const fullPerms: Record<PermissionSection, SectionPermissions> = {
            dashboard: ['view'],
            domains: ['view', 'create', 'update', 'delete'],
            freelancers: ['view', 'create', 'update', 'delete'],
            products: ['view', 'create', 'update', 'delete'],
            blogs: ['view', 'create', 'update', 'delete'],
            requests: ['view', 'create', 'delete'],
            team: ['view', 'create', 'update', 'delete'],
          };
          setState({
            isLoading: false,
            isSuperAdmin: true,
            isAdmin: true,
            isRemoved: false,
            isSuspended: false,
            permissions: fullPerms,
          });
        }
      } else if (userRole === 'admin') {
        console.log('[AccessControl] User is admin - checking team_members');
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('permissions, is_active')
          .eq('user_id', user.id)
          .maybeSingle();

        const isRemoved = !teamMember;
        const isSuspended = teamMember && teamMember.is_active === false;

        console.log('[AccessControl] Team member:', teamMember, 'isRemoved:', isRemoved, 'isSuspended:', isSuspended);

        if (isRemoved) {
          console.log('[AccessControl] Admin has no team_member record - access removed');
          if (isMounted.current) {
            setState({
              isLoading: false,
              isSuperAdmin: false,
              isAdmin: false,
              isRemoved: true,
              isSuspended: false,
              permissions: {} as Record<PermissionSection, SectionPermissions>,
            });
          }
          return;
        }

        if (isSuspended) {
          console.log('[AccessControl] Admin is suspended');
          if (isMounted.current) {
            setState({
              isLoading: false,
              isSuperAdmin: false,
              isAdmin: false,
              isRemoved: false,
              isSuspended: true,
              permissions: {} as Record<PermissionSection, SectionPermissions>,
            });
          }
          return;
        }

        let permissionsData: Record<PermissionSection, SectionPermissions> = {
          dashboard: ['view'],
          domains: ['view', 'create', 'update', 'delete'],
          freelancers: ['view', 'create', 'update', 'delete'],
          products: ['view', 'create', 'update', 'delete'],
          blogs: ['view', 'create', 'update', 'delete'],
          requests: ['view', 'create', 'delete'],
          team: ['view', 'create', 'update', 'delete'],
        };
        
        if (teamMember?.permissions) {
          const parsed = typeof teamMember.permissions === 'string' 
            ? JSON.parse(teamMember.permissions) 
            : teamMember.permissions;
          permissionsData = { ...permissionsData, ...parsed as Record<PermissionSection, SectionPermissions> };
        }

        console.log('[AccessControl] Final permissions:', permissionsData);

        if (isMounted.current) {
          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: true,
            isRemoved: false,
            isSuspended: false,
            permissions: permissionsData,
          });
        }
      } else {
        console.log('[AccessControl] Regular user - no admin access');
        if (isMounted.current) {
          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: false,
            isRemoved: false,
            isSuspended: false,
            permissions: {} as Record<PermissionSection, SectionPermissions>,
          });
        }
      }
    } catch (error) {
      console.error('[AccessControl] Error:', error);
      if (isMounted.current) {
        setState({
          isLoading: false,
          isSuperAdmin: false,
          isAdmin: false,
          isRemoved: false,
          isSuspended: false,
          permissions: {} as Record<PermissionSection, SectionPermissions>,
        });
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    isMounted.current = true;
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPermissions();
    }

    // Event-driven updates
    const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
      await fetchPermissions();
    });

    // Realtime subscription for team_members changes
    const realtimeSub = supabase
      .channel('access_control')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `user_id=eq.${supabase.auth.getUser().data?.user?.id || ''}` },
        () => fetchPermissions()
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      if (authListener?.subscription && typeof authListener.subscription.unsubscribe === 'function') {
        authListener.subscription.unsubscribe();
      }
      if (realtimeSub && typeof realtimeSub.unsubscribe === 'function') {
        supabase.removeChannel(realtimeSub);
      }
    };
  }, [fetchPermissions, supabase]);

  const hasPermission = useCallback((section: PermissionSection, action: PermissionAction): boolean => {
    if (state.isSuperAdmin) return true;
    if (!state.isAdmin) return false;
    const sectionPermissions = state.permissions[section];
    const result = Array.isArray(sectionPermissions) && sectionPermissions.includes(action);
    console.log(`[AccessControl] hasPermission(${section}, ${action}):`, result);
    return result;
  }, [state.isSuperAdmin, state.isAdmin, state.permissions]);

  const canAccessSection = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'view');
  }, [hasPermission]);

  const canAccessDashboard = useCallback((): boolean => {
    const result = !state.isRemoved && !state.isSuspended && hasPermission('dashboard', 'view');
    console.log('[AccessControl] canAccessDashboard:', result);
    return result;
  }, [state.isRemoved, state.isSuspended, hasPermission]);

  const canCreate = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'create');
  }, [hasPermission]);

  const canUpdate = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'update');
  }, [hasPermission]);

  const canDelete = useCallback((section: PermissionSection): boolean => {
    return hasPermission(section, 'delete');
  }, [hasPermission]);

  // Direct access to all permissions for sections - avoids repeated function calls
  const all = useMemo(() => ({
    domains: state.permissions.domains || [],
    blogs: state.permissions.blogs || [],
    freelancers: state.permissions.freelancers || [],
    products: state.permissions.products || [],
    requests: state.permissions.requests || [],
    team: state.permissions.team || [],
    dashboard: state.permissions.dashboard || [],
  }), [state.permissions]);

  return {
    isLoading: state.isLoading,
    isSuperAdmin: state.isSuperAdmin,
    isAdmin: state.isAdmin,
    isRemoved: state.isRemoved,
    isSuspended: state.isSuspended,
    permissions: state.permissions,
    all, // Direct access to all permissions - use instead of repeated canX() calls
    hasPermission,
    canAccessSection,
    canAccessDashboard,
    canCreate,
    canUpdate,
    canDelete,
  };
}

