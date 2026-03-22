"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

// Create Supabase client once outside component to prevent recreation on every render
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import { useSession } from '@/hooks/useSession';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: loading, checkStatus } = useSession();

 // In AuthProvider
const signOut = useCallback(async () => {
  try {
    console.log('[AuthProvider] Starting sign out...');
    await supabase.auth.signOut();
    console.log('[AuthProvider] Sign out complete');
    // Dispatch custom event for UI to handle redirect (avoids double-redirect race)
    window.dispatchEvent(new CustomEvent('auth:logout-complete'));
  } catch (error) {
    console.error('[AuthProvider] Error signing out:', error);
    // On error, dispatch anyway to trigger redirect
    window.dispatchEvent(new CustomEvent('auth:logout-complete'));
  }
}, []);

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
