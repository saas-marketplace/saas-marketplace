"use client";

/**
 * useAuthQuery.ts
 * ═══════════════
 * Single source of truth for all auth + role data.
 *
 * Architecture:
 *  - useAuthUser()    → fetches session + users row, cached 10 min, runs ONCE
 *  - useTeamMember()  → fetches team_members row, ONLY for admin/super_admin
 *
 * All other hooks / components must consume these two hooks.
 * Nobody else calls getSession(), getUser(), or queries users/team_members directly.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin" | "super_admin";

export interface AuthUserData {
  /** Supabase auth user id */
  id: string;
  email: string;
  role: UserRole;
  is_banned: boolean;
  /** Raw session — needed by CartContext, profile page, etc. */
  session: Session;
}

export interface TeamMemberData {
  permissions: Record<string, string[]>;
  is_active: boolean;
  needs_access_restored: boolean;
  display_name: string | null;
  role_label: string | null;
  avatar_url: string | null;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// Stored outside React so every hook instance shares the exact same promise/data.
// This is the key mechanism that prevents N concurrent DB calls.

let _authCache: AuthUserData | null = null;
let _authCacheTime = 0;
let _authInflight: Promise<AuthUserData | null> | null = null;
const AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes

let _teamCache: TeamMemberData | null | undefined = undefined; // undefined = not fetched yet
let _teamCacheUserId: string | null = null;
let _teamInflight: Promise<TeamMemberData | null> | null = null;

/** Clears both caches — called on SIGNED_OUT */
export function clearAuthQueryCache() {
  _authCache = null;
  _authCacheTime = 0;
  _authInflight = null;
  _teamCache = undefined;
  _teamCacheUserId = null;
  _teamInflight = null;
}

// ─── Raw fetchers (deduplicated via module-level inflight promise) ────────────

async function fetchAuthUser(): Promise<AuthUserData | null> {
  // Return cache if still fresh
  if (_authCache && Date.now() - _authCacheTime < AUTH_TTL_MS) {
    return _authCache;
  }

  // Deduplicate concurrent calls — only one network round-trip in flight at once
  if (_authInflight) return _authInflight;

  _authInflight = (async () => {
    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        _authCache = null;
        _authCacheTime = Date.now();
        return null;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, is_banned")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError) {
        console.error("[useAuthQuery] users fetch error:", userError);
        return null;
      }

      const result: AuthUserData = {
        id: session.user.id,
        email: session.user.email ?? "",
        role: (userData?.role as UserRole) ?? "user",
        is_banned: userData?.is_banned ?? false,
        session,
      };

      _authCache = result;
      _authCacheTime = Date.now();
      return result;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.warn("[useAuthQuery] AbortError during fetchAuthUser — skipping");
      } else {
        console.error("[useAuthQuery] fetchAuthUser error:", err);
      }
      return null;
    } finally {
      _authInflight = null;
    }
  })();

  return _authInflight;
}

async function fetchTeamMember(userId: string): Promise<TeamMemberData | null> {
  // Return cache if it belongs to the same user
  if (_teamCacheUserId === userId && _teamCache !== undefined) {
    return _teamCache;
  }

  // Deduplicate
  if (_teamInflight) return _teamInflight;

  _teamInflight = (async () => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("team_members")
        .select(
          "permissions, is_active, needs_access_restored, display_name, role_label, avatar_url"
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[useAuthQuery] team_members fetch error:", error);
        _teamCache = null;
        _teamCacheUserId = userId;
        return null;
      }

      const result: TeamMemberData | null = data
        ? {
            permissions:
              typeof data.permissions === "string"
                ? JSON.parse(data.permissions)
                : (data.permissions ?? {}),
            is_active: data.is_active ?? true,
            needs_access_restored: data.needs_access_restored ?? false,
            display_name: data.display_name ?? null,
            role_label: data.role_label ?? null,
            avatar_url: data.avatar_url ?? null,
          }
        : null;

      _teamCache = result;
      _teamCacheUserId = userId;
      return result;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.warn("[useAuthQuery] AbortError during fetchTeamMember — skipping");
      } else {
        console.error("[useAuthQuery] fetchTeamMember error:", err);
      }
      _teamCache = null;
      _teamCacheUserId = userId;
      return null;
    } finally {
      _teamInflight = null;
    }
  })();

  return _teamInflight;
}

// ─── useAuthUser ──────────────────────────────────────────────────────────────

interface UseAuthUserResult {
  data: AuthUserData | null;
  isLoading: boolean;
}

/**
 * Fetches the authenticated user + their role from the `users` table.
 *
 * Guarantees:
 *  - ONE network call per session (module-level cache + inflight dedup).
 *  - No refetch on window focus, mount, or reconnect.
 *  - All consumers share the same cached data.
 *  - Clears cache and re-fetches on SIGNED_IN / SIGNED_OUT.
 */
export function useAuthUser(): UseAuthUserResult {
  const [data, setData] = useState<AuthUserData | null>(() => _authCache ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!_authCache);
  const mountedRef = useRef(true);
  const listenerRef = useRef<any>(null);

  const load = useCallback(async (clearFirst = false) => {
    if (clearFirst) {
      clearAuthQueryCache();
    }
    if (!mountedRef.current) return;
    setIsLoading(true);
    const result = await fetchAuthUser();
    if (mountedRef.current) {
      setData(result);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Only hit the network if cache is stale
    if (!_authCache || Date.now() - _authCacheTime >= AUTH_TTL_MS) {
      load(false);
    } else {
      // Cache is fresh — set state synchronously, no loading flash
      setData(_authCache);
      setIsLoading(false);
    }

    // Auth state listener — only react to SIGNED_IN / SIGNED_OUT
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event:string) => {
      if (event === "SIGNED_OUT") {
        clearAuthQueryCache();
        if (mountedRef.current) {
          setData(null);
          setIsLoading(false);
        }
      } else if (event === "SIGNED_IN") {
        // Re-fetch if the cache is stale (don't re-fetch on every token refresh)
        if (!_authCache || Date.now() - _authCacheTime >= AUTH_TTL_MS) {
          load(true);
        }
      }
      // TOKEN_REFRESHED, USER_UPDATED → ignore, permissions haven't changed
    });
    listenerRef.current = listener;

    return () => {
      mountedRef.current = false;
      listenerRef.current?.subscription?.unsubscribe();
    };
  }, []); // no deps — runs once, auth listener handles updates

  return { data, isLoading };
}

// ─── useTeamMember ────────────────────────────────────────────────────────────

interface UseTeamMemberResult {
  data: TeamMemberData | null;
  isLoading: boolean;
}

/**
 * Fetches `team_members` for the given user.
 *
 * Rules enforced here:
 *  - NEVER called for role === "user". Returns {data: null, isLoading: false} immediately.
 *  - ONE network call per userId (module-level cache + inflight dedup).
 *  - Result is shared across all consumers.
 */
export function useTeamMember(
  user: AuthUserData | null
): UseTeamMemberResult {
  const isEligible =
    !!user && (user.role === "admin" || user.role === "super_admin");

  const [data, setData] = useState<TeamMemberData | null>(() => {
    if (!isEligible) return null;
    if (user && _teamCacheUserId === user.id && _teamCache !== undefined) {
      return _teamCache;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!isEligible) return false;
    if (user && _teamCacheUserId === user.id && _teamCache !== undefined) {
      return false;
    }
    return true;
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!isEligible || !user) {
      // Regular users → never fetch team_members
      setData(null);
      setIsLoading(false);
      return;
    }

    // Cache hit for same user
    if (_teamCacheUserId === user.id && _teamCache !== undefined) {
      setData(_teamCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchTeamMember(user.id).then((result) => {
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id, isEligible]);

  return { data, isLoading };
}

// ─── Convenience invalidation ─────────────────────────────────────────────────

/** Call after updating team_members to force a fresh fetch next time */
export function invalidateTeamMemberCache() {
  _teamCache = undefined;
  _teamCacheUserId = null;
  _teamInflight = null;
}

/** Call after updating the users row (role, banned) to force a fresh auth fetch */
export function invalidateAuthCache() {
  _authCache = null;
  _authCacheTime = 0;
  _authInflight = null;
}