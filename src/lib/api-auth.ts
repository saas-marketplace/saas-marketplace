/**
 * api-auth.ts
 * ══════════
 * Shared server-side authorisation helpers for API routes.
 *
 * Client-side permission checks in this project are only a UI convenience.
 * Anything that writes data must re-check on the server, because the browser
 * can be bypassed.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthedAdmin {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  user: { id: string; email: string | undefined };
  role: "user" | "admin" | "super_admin";
  /** Effective product permissions, already merged with role defaults. */
  productPermissions: string[];
}

const DEFAULT_ADMIN_PRODUCT_PERMISSIONS = ["view", "create", "update", "delete"];

function parsePermissions(raw: unknown): Record<string, string[]> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string[]>) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, string[]>;
  return {};
}

/**
 * Resolves the caller and their product permissions.
 * Returns null when not authenticated or not an admin at all.
 */
export async function getAuthedAdmin(): Promise<AuthedAdmin | null> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (userRow?.role as "user" | "admin" | "super_admin" | undefined) ?? "user";
  if (role === "user") return null;

  if (role === "super_admin") {
    return {
      supabase,
      user: { id: user.id, email: user.email },
      role,
      productPermissions: [...DEFAULT_ADMIN_PRODUCT_PERMISSIONS],
    };
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("permissions")
    .eq("user_id", user.id)
    .maybeSingle();

  const perms = parsePermissions(member?.permissions);
  const fromMember = Array.isArray(perms.products) ? perms.products : [];

  return {
    supabase,
    user: { id: user.id, email: user.email },
    role,
    productPermissions: fromMember.length > 0 ? fromMember : [...DEFAULT_ADMIN_PRODUCT_PERMISSIONS],
  };
}

/** True when the admin may perform the given action on products. */
export function canManageProducts(admin: AuthedAdmin, action: "create" | "update" | "delete"): boolean {
  return admin.productPermissions.includes(action);
}

/** True when the caller is a super admin. */
export function isSuperAdmin(admin: AuthedAdmin): boolean {
  return admin.role === "super_admin";
}
