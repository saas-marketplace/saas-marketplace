"use client"

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import type { PermissionSection, PermissionAction, SectionPermissions } from '@/types/permissions';

interface UserPermissionsState {
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isRemoved: boolean;
  isSuspended: boolean;
  isRestored: boolean;
  permissions: Record<PermissionSection, SectionPermissions>;
  accessibleSections: PermissionSection[];
  session: Session | null;
  user: User | null;
}

export function useSession() {
  const [state, setState] = useState<UserPermissionsState>({
    isLoading: true,
    isSuperAdmin: false,
    isAdmin: false,
    isRemoved: false,
    isSuspended: false,
    isRestored: false,
    permissions: {} as any,
    accessibleSections: [],
    session: null,
    user: null,
  });

  const supabase = createClient();
  const sessionRef = useRef(false);
  const isFetchingRef = useRef(false);
  const fetchedRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const authListenerRef = useRef<any>(null);

  const clearState = useCallback(() => {
    if (mountedRef.current) {
      setState({
        isLoading: false,
        isSuperAdmin: false,
        isAdmin: false,
        isRemoved: false,
        isSuspended: false,
        isRestored: false,
        permissions: {} as Record<PermissionSection, SectionPermissions>,
        accessibleSections: [],
        session: null,
        user: null,
      });
    }
    sessionRef.current = false;
    isFetchingRef.current = false;
    fetchedRef.current = false;
  }, []);

  const fetchPermissions = useCallback(async () => {
    if (sessionRef.current || isFetchingRef.current) return;
    sessionRef.current = true;
    isFetchingRef.current = true;

    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const user = session?.user ?? null;

      if (mountedRef.current) {
        setState(prev => ({ ...prev, session, user, isLoading: false }));
      }

      if (!user) {
        clearState();
        return;
      }

      // Single parallel fetch: users.role + team_members
      const [userResult, teamResult] = await Promise.all([
        supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('team_members').select('permissions, is_active, needs_access_restored').eq('user_id', user.id).maybeSingle(),
      ]);

      const userRole = userResult.data?.role || 'user';
      const teamMember = teamResult.data;

      console.log('[useSession] Role:', userRole, 'Team:', teamMember);

      if (userRole === 'super_admin') {
        const fullPerms: Record<PermissionSection, SectionPermissions> = {
          dashboard: ['view'],
          domains: ['view', 'create', 'update', 'delete'],
          freelancers: ['view', 'create', 'update', 'delete'],
          products: ['view', 'create', 'update', 'delete'],
          blogs: ['view', 'create', 'update', 'delete'],
          requests: ['view', 'create', 'delete'],
          team: ['view', 'create', 'update', 'delete'],
        };
        if (mountedRef.current) {
          setState({
            isLoading: false,
            isSuperAdmin: true,
            isAdmin: true,
            isRemoved: false,
            isSuspended: false,
            isRestored: false,
            permissions: fullPerms,
            accessibleSections: Object.keys(fullPerms) as PermissionSection[],
            session,
            user,
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
            isRestored: false,
            permissions: {} as Record<PermissionSection, SectionPermissions>,
            accessibleSections: [],
            session,
            user,
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
          isRestored: needsRestore,
          permissions: permissionsData,
          accessibleSections: sections,
          session,
          user,
        });

        // One-time restore clear
        if (needsRestore && teamMember) {
          await supabase.from('team_members').update({ needs_access_restored: false }).eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('[useSession] Error:', error);
      clearState();
    } finally {
      isFetchingRef.current = false;
    }
  }, [supabase, clearState]);

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
    await fetchPermissions();
  }, [fetchPermissions]);

  // Setup: initial fetch + realtime + auth listener
  useEffect(() => {
    mountedRef.current = true;
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPermissions();
    }

    // Single realtime channel for team_members
    realtimeChannelRef.current = supabase.channel('user_permissions')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${state.user?.id || ''}`
        },
        fetchPermissions
      )
      .subscribe();

    // Auth listener (debounced)
    authListenerRef.current = supabase.auth.onAuthStateChange(async (event: string) => {
      console.log('[useSession] Auth state changed:', event);
      if (event === 'SIGNED_OUT') {
        // Clear all state on logout
        clearState();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh permissions on login or token refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        sessionRef.current = false; // Reset ref on auth change
        fetchedRef.current = false;
        await fetchPermissions();
      }
    });

    return () => {
      mountedRef.current = false;
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
    };
  }, [fetchPermissions, supabase, clearState]);

  return {
    ...state,
    hasPermission,
    canAccessSection,
    canCreate,
    canUpdate,
    canDelete,
    checkStatus,
  };
}

