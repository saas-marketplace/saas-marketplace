"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

export type UserRole = "user" | "admin" | "super_admin";

interface User { id: string; email: string }

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let supabaseClient: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
}

async function fetchUserRole(supabase: SupabaseClient, userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  if (error) console.error("Error fetching user role:", error);
  return data?.role as UserRole | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  }, [supabase]);

  useEffect(() => {
    let canceled = false;
    if (user) {
      fetchUserRole(supabase, user.id).then((r) => { if (!canceled) setRole(r); });
    } else setRole(null);
    return () => { canceled = true };
  }, [user, supabase]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!mounted) return;
        if (session?.user) setUser({ id: session.user.id, email: session.user.email || "" });
        else { setUser(null); setRole(null); }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      if (session?.user) setUser({ id: session.user.id, email: session.user.email || "" });
      else { setUser(null); setRole(null); }
      setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  // Tab focus / visibility refresh
  useEffect(() => {
    let refreshing = false;

    const handleRefresh = async () => {
      if (!refreshing) {
        refreshing = true;
        setTimeout(async () => { await refreshSession(); refreshing = false; }, 100);
      }
    };

    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') handleRefresh(); });
    window.addEventListener('focus', handleRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [refreshSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, supabase, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function useHasRole(requiredRoles: UserRole[]) {
  const { role, loading } = useAuth();
  return { isAuthorized: role ? requiredRoles.includes(role) : false, isLoading: loading, role };
}
