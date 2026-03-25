"use client";

/**
 * useAccessControl.ts
 * ════════════════════
 * Backward-compatible hook for dashboard pages.
 *
 * Previously this hook called getUser() + users + team_members on its own,
 * duplicating every query already made by AuthProvider.
 * Now it reads from the shared PermissionsContext — zero extra DB calls.
 */

import { useCallback, useMemo } from "react";
import { usePermissions } from "@/stores/permissions-context";
import type { PermissionSection, PermissionAction } from "@/types/permissions";

export function useAccessControl() {
  const p = usePermissions();

  const hasPermission = useCallback(
    (section: PermissionSection, action: PermissionAction): boolean =>
      p.hasPermission(section, action),
    [p]
  );

  const canAccessSection = useCallback(
    (section: PermissionSection) => p.canAccessSection(section),
    [p]
  );

  const canAccessDashboard = useCallback(
    () =>
      !p.isRemoved &&
      !p.isSuspended &&
      p.hasPermission("dashboard", "view"),
    [p]
  );

  const canCreate = useCallback(
    (section: PermissionSection) => p.canCreate(section),
    [p]
  );
  const canUpdate = useCallback(
    (section: PermissionSection) => p.canUpdate(section),
    [p]
  );
  const canDelete = useCallback(
    (section: PermissionSection) => p.canDelete(section),
    [p]
  );

  return useMemo(
    () => ({
      isLoading: p.isLoading,
      isSuperAdmin: p.isSuperAdmin,
      isAdmin: p.isAdmin,
      isRemoved: p.isRemoved,
      isSuspended: p.isSuspended,
      permissions: p.permissions,
      all: p.all,
      hasPermission,
      canAccessSection,
      canAccessDashboard,
      canCreate,
      canUpdate,
      canDelete,
    }),
    [p, hasPermission, canAccessSection, canAccessDashboard, canCreate, canUpdate, canDelete]
  );
}