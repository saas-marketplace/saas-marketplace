"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

export type UserRole = "user" | "admin" | "super_admin";

import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User extends Omit<SupabaseUser, 'email'> { email: string; }

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Removed - using useSession instead


import { useSession } from '@/hooks/useSession';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: loading, checkStatus } = useSession();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

 // In AuthProvider
const signOut = useCallback(async () => {
  try {
    await supabase.auth.signOut(); // wait for Supabase
    // Redirect to login page after successful sign-out
    router.push('/auth/login');
  } catch (error) {
    console.error('Error signing out:', error);
    // Fallback redirect in case of error
    window.location.href = '/auth/login';
  }
}, [supabase, router]);

  const refreshSession = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  // Tab focus refresh
  useEffect(() => {
    let refreshing = false;
    const handleRefresh = () => {
      if (!refreshing) {
        refreshing = true;
        setTimeout(() => { 
          checkStatus(); 
          refreshing = false; 
        }, 100);
      }
    };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') handleRefresh(); });
    window.addEventListener('focus', handleRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [checkStatus]);

  return (
    <AuthContext.Provider value={{ user: user as User | null, role: user ? 'admin' as UserRole : null, loading, signOut, supabase, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Centralized logout hook - use this everywhere
export function useLogout() {
  return useAuth().signOut;
}

export function useHasRole(requiredRoles: UserRole[]) {
  const { role, loading } = useAuth();
  return { isAuthorized: role ? requiredRoles.includes(role) : false, isLoading: loading, role };
}
