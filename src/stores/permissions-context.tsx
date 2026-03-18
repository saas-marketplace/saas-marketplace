"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [accessibleSections, setAccessibleSections] = useState<PermissionSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get user role from users table
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = userData?.role || 'user';

      if (userRole === 'super_admin') {
        setIsSuperAdmin(true);
        setIsAdmin(true);
        // Super admin has access to all sections
        setAccessibleSections(['domains', 'freelancers', 'products', 'blogs', 'requests', 'team']);
        setPermissions({
          domains: ['view', 'create', 'update', 'delete'],
          freelancers: ['view', 'create', 'update', 'delete'],
          products: ['view', 'create', 'update', 'delete'],
          blogs: ['view', 'create', 'update', 'delete'],
          requests: ['view', 'create', 'update', 'delete'],
          team: ['view', 'create', 'update', 'delete'],
        });
      } else if (userRole === 'admin') {
        setIsAdmin(true);
        // Get team member permissions
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('permissions')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (teamMember?.permissions) {
          setPermissions(teamMember.permissions);
          // Extract accessible sections from permissions
          const sections = Object.keys(teamMember.permissions) as PermissionSection[];
          setAccessibleSections(
            sections.filter(section => 
              teamMember.permissions[section]?.includes('view')
            )
          );
        }
      }

      setIsLoading(false);
    };

    fetchPermissions();
  }, []);

  const hasPermission = (section: PermissionSection, action: PermissionAction): boolean => {
    if (isSuperAdmin) return true;
    const sectionPermissions = permissions[section];
    if (!sectionPermissions) return false;
    return sectionPermissions.includes(action);
  };

  const canAccessSection = (section: PermissionSection): boolean => {
    return hasPermission(section, 'view');
  };

  const canCreate = (section: PermissionSection): boolean => {
    return hasPermission(section, 'create');
  };

  const canUpdate = (section: PermissionSection): boolean => {
    return hasPermission(section, 'update');
  };

  const canDelete = (section: PermissionSection): boolean => {
    return hasPermission(section, 'delete');
  };

  return (
    <PermissionsContext.Provider
      value={{
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
      }}
    >
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
