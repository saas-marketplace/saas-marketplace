"use client";

/**
 * auth-provider.tsx
 * ═════════════════
 * Thin wrapper around useAuthUser() + useTeamMember().
 *
 * ✅ Zero direct DB calls — all data flows from the cached hooks.
 * ✅ users table → 1 query total (via useAuthUser module cache).
 * ✅ team_members → 0 queries for role==="user", 1 query for admins.
 * ✅ No duplicate getSession / getUser calls on mount.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useAuthUser,
  useTeamMember,
  clearAuthQueryCache,
  type AuthUserData,
  type UserRole,
} from "@/hooks/useAuthQuery";
import type { PermissionSection, SectionPermissions } from "@/types/permissions";

// ─── Re-exports for backward compatibility ────────────────────────────────────
export type { UserRole };

// Global flag consumed by useSession to skip re-fetches during password change
export let isPasswordChanging = false;
export function setPasswordChanging(value: boolean) {
  isPasswordChanging = value;
}

// Kept for files that import these but they're no-ops now — lock contention
// is prevented at the module level in useAuthQuery.ts
let _authLock = false;
export function acquireAuthLock(): boolean {
  if (_authLock) return false;
  _authLock = true;
  return true;
}
export function releaseAuthLock() {
  _authLock = false;
}

// ─── Permission constants ─────────────────────────────────────────────────────

const DEFAULT_ADMIN_PERMISSIONS: Record<string, string[]> = {
  dashboard: ["view"],
  domains: ["view", "create", "update", "delete"],
  freelancers: ["view", "create", "update", "delete"],
  products: ["view", "create", "update", "delete"],
  blogs: ["view", "create", "update", "delete"],
  requests: ["view", "create", "delete"],
  team: ["view", "create", "update", "delete"],
  users: [],
  contact_submissions: [],
};

const DEFAULT_SUPER_ADMIN_PERMISSIONS: Record<string, string[]> = {
  ...DEFAULT_ADMIN_PERMISSIONS,
  users: ["view", "create", "update", "delete"],
  contact_submissions: ["view", "create", "delete"],
};

// ─── AuthUser shape exposed through context ───────────────────────────────────

interface AuthContextUser {
  id: string;
  email: string;
  role: UserRole;
  isBanned: boolean;
  isRemoved: boolean;
  isSuspended: boolean;
  permissions: Record<string, string[]>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: AuthContextUser | null;
  /** Raw AuthUserData (includes session) for components that need the session token */
  authData: AuthUserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton supabase client
const supabase = createClient();

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // ① One call to users table — cached at module level
  const { data: authData, isLoading: authLoading } = useAuthUser();

  // ② team_members — only fires for admin/super_admin, never for role==="user"
  const { data: teamMember, isLoading: teamLoading } = useTeamMember(authData);

  // ③ Build the AuthContextUser from cached data — no extra DB calls
  const user = useMemo<AuthContextUser | null>(() => {
    if (!authData) return null;
    if (authData.is_banned) return null;

    const { role } = authData;

    if (role === "super_admin") {
      return {
        id: authData.id,
        email: authData.email,
        role,
        isBanned: false,
        isRemoved: false,
        isSuspended: false,
        permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS,
      };
    }

    if (role === "admin") {
      const isRemoved = teamMember === null && !teamLoading;
      const isSuspended = teamMember?.is_active === false;

      const permissions = teamMember?.permissions
        ? { ...DEFAULT_ADMIN_PERMISSIONS, ...teamMember.permissions }
        : DEFAULT_ADMIN_PERMISSIONS;

      return {
        id: authData.id,
        email: authData.email,
        role,
        isBanned: false,
        isRemoved,
        isSuspended,
        permissions,
      };
    }

    // role === "user" — no team_members lookup, ever
    return {
      id: authData.id,
      email: authData.email,
      role: "user",
      isBanned: false,
      isRemoved: false,
      isSuspended: false,
      permissions: {},
    };
  }, [authData, teamMember, teamLoading]);

  const loading = authLoading || (authData?.role !== "user" && teamLoading);

  const signOut = useCallback(async () => {
    clearAuthQueryCache();
    await supabase.auth.signOut();
  }, []);

  const refreshSession = useCallback(async () => {
    // Bust the cache so next useAuthUser render re-fetches
    clearAuthQueryCache();
    // useAuthUser's auth listener will pick up SIGNED_IN and reload
    await supabase.auth.getSession();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, authData, loading, signOut, refreshSession }),
    [user, authData, loading, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}

export function useSignOut() {
  return useAuth().signOut;
}

export function useHasRole(requiredRoles: UserRole[]) {
  const { user, loading } = useAuth();
  return {
    isAuthorized: user ? requiredRoles.includes(user.role) : false,
    isLoading: loading,
    role: user?.role ?? null,
  };
}