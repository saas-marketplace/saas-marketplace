"use client"

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isPasswordChanging } from '@/components/providers/auth-provider';
import type { Session, User } from '@supabase/supabase-js';
import type { PermissionSection, PermissionAction, SectionPermissions } from '@/types/permissions';

interface UserPermissionsState {
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isRemoved: boolean;
  isSuspended: boolean;
  isRestored: boolean;
  isBanned: boolean;
  bannedIp: string | null;
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
    isBanned: false,
    bannedIp: null,
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
  // Track current session token to prevent unnecessary re-renders
  const currentTokenRef = useRef<string | null>(null);

  const clearState = useCallback(() => {
    if (mountedRef.current) {
      setState({
        isLoading: false,
        isSuperAdmin: false,
        isAdmin: false,
        isRemoved: false,
        isSuspended: false,
        isRestored: false,
        isBanned: false,
        bannedIp: null,
        permissions: {} as Record<PermissionSection, SectionPermissions>,
        accessibleSections: [],
        session: null,
        user: null,
      });
    }
    sessionRef.current = false;
    isFetchingRef.current = false;
    fetchedRef.current = false;
    currentTokenRef.current = null;
  }, []);

  const fetchPermissions = useCallback(async () => {
    if (sessionRef.current || isFetchingRef.current) return;
    sessionRef.current = true;
    isFetchingRef.current = true;

    try {
      // Get session directly from supabase
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (error) {
        // Handle AbortError gracefully
        if (error.name === 'AbortError') {
          console.warn('[useSession] AbortError during getSession — ignoring (likely a token refresh race)');
          isFetchingRef.current = false;
          sessionRef.current = false;
          return;
        }
        throw error;
      }

      const user = session?.user ?? null;

      if (mountedRef.current) {
        setState(prev => {
          if (prev.session?.access_token === session?.access_token && prev.user?.id === user?.id) {
            return prev;
          }
          // Update the token ref to track current session
          currentTokenRef.current = session?.access_token ?? null;
          return { ...prev, session, user, isLoading: false };
        });
      }

      if (!user) {
        clearState();
        return;
      }

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
          users: ['view', 'create', 'update', 'delete'],  // Users Management - Super Admin only
          contact_submissions: ['view', 'create', 'delete'],  // Contact Submissions - Super Admin only
        };
        if (mountedRef.current) {
          setState({
            isLoading: false,
            isSuperAdmin: true,
            isAdmin: true,
            isRemoved: false,
            isSuspended: false,
            isRestored: false,
            isBanned: false,
            bannedIp: null,
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
            isBanned: false,
            bannedIp: null,
            permissions: {} as Record<PermissionSection, SectionPermissions>,
            accessibleSections: [],
            session,
            user,
          });
        }
        return;
      }

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
          users: [],  // Not accessible to regular admins
          contact_submissions: [],  // Not accessible to regular admins
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
          isBanned: false,
          bannedIp: null,
          permissions: permissionsData,
          accessibleSections: sections,
          session,
          user,
        });

        if (needsRestore && teamMember) {
          await supabase.from('team_members').update({ needs_access_restored: false }).eq('user_id', user.id);
        }
      }
    } catch (error: any) {
      // AbortError means a newer auth request took over — this is harmless after
      // password update (Supabase token refresh). Don't clear the session for it.
      if (error?.name === 'AbortError') {
        console.warn('[useSession] AbortError during fetch — ignoring (likely a token refresh race)');
        // Reset refs to allow retry
        isFetchingRef.current = false;
        sessionRef.current = false;
      } else {
        console.error('[useSession] Error:', error);
        clearState();
      }
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

  useEffect(() => {
    mountedRef.current = true;
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPermissions();
    }

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

    authListenerRef.current = supabase.auth.onAuthStateChange(async (event: unknown, session: Session | null) => {
      console.log('[useSession] Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        clearState();
        return;
      }

      // TOKEN_REFRESHED and USER_UPDATED both fire after updateUser({ password }).
      // Permissions haven't changed — re-fetching causes the IndexedDB lock steal
      // → AbortError → accidental logout. Skip both entirely.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log('[useSession] ' + event + ' — skipping re-fetch, permissions unchanged');
        return;
      }

      if (event === 'SIGNED_IN') {
        // Skip re-fetch if a password change is in progress.
        // signInWithPassword (step 1) fires SIGNED_IN before updateUser (step 2)
        // runs. If we re-fetch here we acquire the Web Lock, making updateUser
        // wait 5 s then receive a 422. The flag is cleared by the profile page
        // after updateUser resolves.
        if (isPasswordChanging) {
          console.log('[useSession] SIGNED_IN during password change — skipping re-fetch');
          return;
        }
        // CRITICAL: Check if session actually changed before triggering re-render
        // This prevents unnecessary re-renders that wipe component state after password update
        if (currentTokenRef.current === session?.access_token) {
          console.log('[useSession] SIGNED_IN but token unchanged — skipping re-render');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        sessionRef.current = false;
        fetchedRef.current = false;
        await fetchPermissions();
      }
    });

    return () => {
      mountedRef.current = false;
      // Do NOT call clearAuthCache() here. Clearing on unmount (including React
      // Strict Mode's double-mount) resets the JS cache and forces every
      // component to call supabase.auth.getSession() concurrently on re-mount,
      // which floods the Supabase Web Lock and causes the 5s timeout + steal cascade.
      // Cache is only cleared on an actual SIGNED_OUT event above.
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (authListenerRef.current?.data?.subscription) {
        authListenerRef.current.data.subscription.unsubscribe();
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