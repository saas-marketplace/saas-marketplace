"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PermissionSection, PermissionAction } from '@/types/permissions';

interface AccessControlState {
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  permissions: Record<string, string[]>;
}

export function useAccessControl() {
  const [state, setState] = useState<AccessControlState>({
    isLoading: true,
    isSuperAdmin: false,
    isAdmin: false,
    permissions: {},
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      const supabase = createClient();

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: false,
            permissions: {},
          });
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const userRole = userData?.role || 'user';
        console.log('[AccessControl] User role:', userRole, 'User ID:', user.id);

        // Super admin has ALL permissions
        if (userRole === 'super_admin') {
          console.log('[AccessControl] User is super_admin - granting full permissions');
          setState({
            isLoading: false,
            isSuperAdmin: true,
            isAdmin: true,
            permissions: {
              domains: ['view', 'create', 'update', 'delete'],
              freelancers: ['view', 'create', 'update', 'delete'],
              products: ['view', 'create', 'update', 'delete'],
              blogs: ['view', 'create', 'update', 'delete'],
              requests: ['view', 'create', 'update', 'delete'],
              team: ['view', 'create', 'update', 'delete'],
            },
          });
        } else if (userRole === 'admin') {
          console.log('[AccessControl] User is admin - checking team_members for custom permissions');

          // Use maybeSingle to avoid errors if no record
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('permissions, is_active')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('[AccessControl] Team member query result:', { teamMember });

          if (!teamMember || !teamMember.is_active) {
            console.log('[AccessControl] Admin inactive or no team member entry');
            setState({
              isLoading: false,
              isSuperAdmin: false,
              isAdmin: false,
              permissions: {},
            });
            return;
          }

          let permissionsData: Record<string, string[]> = {};
          if (teamMember.permissions) {
            permissionsData = typeof teamMember.permissions === 'string'
              ? JSON.parse(teamMember.permissions)
              : teamMember.permissions;
          }

          console.log('[AccessControl] Loaded permissions:', permissionsData);

          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: true,
            permissions: permissionsData,
          });
        } else {
          console.log('[AccessControl] User is regular user - no admin permissions');
          setState({
            isLoading: false,
            isSuperAdmin: false,
            isAdmin: false,
            permissions: {},
          });
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setState({
          isLoading: false,
          isSuperAdmin: false,
          isAdmin: false,
          permissions: {},
        });
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = useCallback((section: PermissionSection, action: PermissionAction): boolean => {
    if (state.isSuperAdmin) return true;
    if (!state.isAdmin) return false; // enforce inactive or non-admin
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

  return {
    isLoading: state.isLoading,
    isSuperAdmin: state.isSuperAdmin,
    isAdmin: state.isAdmin,
    permissions: state.permissions,
    hasPermission,
    canAccessSection,
    canCreate,
    canUpdate,
    canDelete,
  };
}