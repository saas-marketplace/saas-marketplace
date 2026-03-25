"use client";

/**
 * useSession.ts
 * ═════════════
 * Backward-compatible hook for dashboard pages.
 *
 * Previously this hook called getSession() + users + team_members on its own.
 * Now it simply reads from the shared AuthProvider context — zero extra DB calls.
 *
 * The public API is unchanged so all existing consumers work without edits.
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { usePermissions } from "@/stores/permissions-context";
import type { PermissionSection, PermissionAction } from "@/types/permissions";

export function useSession() {
  const { user, authData, loading } = useAuth();
  const permissions = usePermissions();

  const hasPermission = useCallback(
    (section: PermissionSection, action: PermissionAction): boolean =>
      permissions.hasPermission(section, action),
    [permissions]
  );

  const canAccessSection = useCallback(
    (section: PermissionSection) => permissions.canAccessSection(section),
    [permissions]
  );

  const canCreate = useCallback(
    (section: PermissionSection) => permissions.canCreate(section),
    [permissions]
  );

  const canUpdate = useCallback(
    (section: PermissionSection) => permissions.canUpdate(section),
    [permissions]
  );

  const canDelete = useCallback(
    (section: PermissionSection) => permissions.canDelete(section),
    [permissions]
  );

  const checkStatus = useCallback(async () => {
    await permissions.checkStatus();
  }, [permissions]);

  return useMemo(
    () => ({
      // Loading
      isLoading: loading || permissions.isLoading,

      // Role flags
      isSuperAdmin: permissions.isSuperAdmin,
      isAdmin: permissions.isAdmin,
      isRemoved: permissions.isRemoved,
      isSuspended: permissions.isSuspended,
      isRestored: false, // legacy field — handled by SuspendedContext
      isBanned: user?.isBanned ?? false,
      bannedIp: null,

      // Permissions
      permissions: permissions.permissions,
      accessibleSections: permissions.accessibleSections,

      // Session data (raw Supabase objects for components that need them)
      session: authData?.session ?? null,
      user: authData?.session?.user ?? null,

      // Methods
      hasPermission,
      canAccessSection,
      canCreate,
      canUpdate,
      canDelete,
      checkStatus,
    }),
    [
      loading,
      permissions,
      user,
      authData,
      hasPermission,
      canAccessSection,
      canCreate,
      canUpdate,
      canDelete,
      checkStatus,
    ]
  );
}