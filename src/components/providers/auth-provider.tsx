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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const signOut = useCallback(async () => {
    try {
      // Sign out from Supabase - await completion
      await supabase.auth.signOut();
      
      // Give Supabase time to sync session state server-side (fixes race condition)
      setTimeout(() => {
        // Force full page reload to clear all client state, caches, and localStorage
        window.location.href = '/auth/login';
      }, 500);
      
      // Auth listeners in useSession/providers will handle state clearing
    } catch (error) {
      console.error('Error during logout:', error);
      // Even on error, force redirect after delay
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 500);
    }
  }, [supabase]);

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
