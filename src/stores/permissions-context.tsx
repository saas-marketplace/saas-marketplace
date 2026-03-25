"use client";

/**
 * permissions-context.tsx
 * ════════════════════════
 * Derives permission state from AuthProvider.
 *
 * ✅ Zero DB calls — all data comes from AuthProvider which uses useAuthUser/useTeamMember.
 * ✅ No duplicate users/team_members queries.
 * ✅ Realtime team_members subscription invalidates the module-level cache and triggers
 *    a lightweight re-fetch via invalidateTeamMemberCache().
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { invalidateTeamMemberCache } from "@/hooks/useAuthQuery";
import type {
  PermissionSection,
  PermissionAction,
  SectionPermissions,
} from "@/types/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

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

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // All data comes from AuthProvider — no DB calls here
  const { user, loading } = useAuth();
  const realtimeRef = useRef<any>(null);
  const supabase = createClient();

  // Set up realtime subscription for team_members changes.
  // When a change arrives, we invalidate the module cache so the next render
  // picks up fresh data. We do NOT call fetchPermissions() ourselves — that
  // would re-introduce the duplicate query problem. Instead we rely on the
  // auth state flow to propagate the update.
  useEffect(() => {
    if (!user?.id || user.role === "user") return;

    const channel = supabase
      .channel(`permissions_realtime_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Bust the team_members cache — AuthProvider will re-derive on
          // the next render cycle triggered by the real-time event.
          invalidateTeamMemberCache();
        }
      )
      .subscribe();

    realtimeRef.current = channel;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [user?.id, user?.role, supabase]);

  // Derive everything from user — zero extra queries
  const derived = useMemo(() => {
    if (!user || loading) {
      return {
        isSuperAdmin: false,
        isAdmin: false,
        isRemoved: false,
        isSuspended: false,
        permissions: {} as Record<PermissionSection, SectionPermissions>,
        accessibleSections: [] as PermissionSection[],
        all: {} as Record<string, string[]>,
      };
    }

    const isSuperAdmin = user.role === "super_admin";
    const isAdmin = user.role === "admin" || isSuperAdmin;
    const perms = user.permissions as Record<PermissionSection, SectionPermissions>;

    const accessibleSections = (
      Object.keys(perms) as PermissionSection[]
    ).filter(
      (s) => Array.isArray(perms[s]) && (perms[s] as string[]).includes("view")
    );

    return {
      isSuperAdmin,
      isAdmin,
      isRemoved: user.isRemoved,
      isSuspended: user.isSuspended,
      permissions: perms,
      accessibleSections,
      all: perms as Record<string, string[]>,
    };
  }, [user, loading]);

  const hasPermission = useCallback(
    (section: PermissionSection, action: PermissionAction): boolean => {
      if (derived.isSuperAdmin) return true;
      if (!derived.isAdmin) return false;
      const sp = derived.permissions[section];
      return Array.isArray(sp) && (sp as string[]).includes(action);
    },
    [derived.isSuperAdmin, derived.isAdmin, derived.permissions]
  );

  const canAccessSection = useCallback(
    (section: PermissionSection) => hasPermission(section, "view"),
    [hasPermission]
  );
  const canCreate = useCallback(
    (section: PermissionSection) => hasPermission(section, "create"),
    [hasPermission]
  );
  const canUpdate = useCallback(
    (section: PermissionSection) => hasPermission(section, "update"),
    [hasPermission]
  );
  const canDelete = useCallback(
    (section: PermissionSection) => hasPermission(section, "delete"),
    [hasPermission]
  );

  // checkStatus is a no-op placeholder kept for backward compat.
  // Callers that previously used it to force a re-fetch should instead
  // call invalidateTeamMemberCache() + invalidateAuthCache() from useAuthQuery.
  const checkStatus = useCallback(async () => {
    invalidateTeamMemberCache();
    // The next render cycle will pick up fresh data automatically.
  }, []);

  const value = useMemo<PermissionsContextType>(
    () => ({
      isLoading: loading,
      ...derived,
      hasPermission,
      canAccessSection,
      canCreate,
      canUpdate,
      canDelete,
      checkStatus,
    }),
    [loading, derived, hasPermission, canAccessSection, canCreate, canUpdate, canDelete, checkStatus]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}