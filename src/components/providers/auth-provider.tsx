"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Global flag to prevent auth events during password change
// Set to true before signInWithPassword, false after updateUser resolves
export let isPasswordChanging = false;

// Setter functions to allow modification from other modules
export function setPasswordChanging(value: boolean) {
  isPasswordChanging = value;
}

// Shared lock mechanism to prevent concurrent auth requests causing "Lock broken" errors
let _authLock = false;

export function acquireAuthLock(): boolean {
  if (_authLock) return false;
  _authLock = true;
  return true;
}

export function releaseAuthLock() {
  _authLock = false;
}

// Types
export type UserRole = "user" | "admin" | "super_admin";

interface UserMetadata {
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isBanned: boolean;
  isRemoved: boolean;
  isSuspended: boolean;
  permissions: Record<string, string[]>;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: ReturnType<typeof createBrowserClient>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ FIX: Use the singleton client from lib/supabase/client.ts
// Previously this called createBrowserClient() directly, creating a second
// Supabase instance that raced for the Web Lock with useSession and CartContext,
// causing the "Lock was not released within 5000ms" / AbortError cascade.
const supabase = createClient();

// Default permissions for each role
const DEFAULT_ADMIN_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['view'],
  domains: ['view', 'create', 'update', 'delete'],
  freelancers: ['view', 'create', 'update', 'delete'],
  products: ['view', 'create', 'update', 'delete'],
  blogs: ['view', 'create', 'update', 'delete'],
  requests: ['view', 'create', 'delete'],
  team: ['view', 'create', 'update', 'delete'],
  users: [],
  contact_submissions: [],
};

const DEFAULT_SUPER_ADMIN_PERMISSIONS: Record<string, string[]> = {
  ...DEFAULT_ADMIN_PERMISSIONS,
  users: ['view', 'create', 'update', 'delete'],
  contact_submissions: ['view', 'create', 'delete'],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Fetch user data from database
  const fetchUserData = useCallback(async (session: Session): Promise<AuthUser | null> => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_banned')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError) {
        console.error('[AuthProvider] Error fetching user data:', userError);
        return null;
      }

      const userRole = (userData?.role as UserRole) || 'user';
      const isBanned = userData?.is_banned || false;

      // If banned, return null
      if (isBanned) {
        return null;
      }

      // Get team member data for admins
      let isRemoved = false;
      let isSuspended = false;
      let permissions: Record<string, string[]> = {};

      if (userRole === 'admin' || userRole === 'super_admin') {
        const { data: teamMember, error: teamError } = await supabase
          .from('team_members')
          .select('permissions, is_active')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!teamError && teamMember) {
          isRemoved = false;
          isSuspended = teamMember.is_active === false;
          
          if (teamMember.permissions) {
            permissions = typeof teamMember.permissions === 'string'
              ? JSON.parse(teamMember.permissions)
              : teamMember.permissions;
          }
        } else if (userRole === 'admin') {
          // Admin without team_member record is removed
          isRemoved = true;
        }
      }

      return {
        id: session.user.id,
        email: session.user.email || '',
        role: userRole,
        isBanned,
        isRemoved,
        isSuspended,
        permissions: userRole === 'super_admin' 
          ? DEFAULT_SUPER_ADMIN_PERMISSIONS 
          : { ...DEFAULT_ADMIN_PERMISSIONS, ...permissions },
      };
    } catch (error) {
      console.error('[AuthProvider] Error in fetchUserData:', error);
      return null;
    }
  }, []);

  // Initialize auth state - runs only once
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          const userData = await fetchUserData(currentSession);
          setUser(userData);
        }
      } catch (error) {
        console.error('[AuthProvider] Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [initialized, fetchUserData]);

  // Listen for auth state changes (excluding INITIAL_SESSION as it's handled above)
  useEffect(() => {
    let isProcessing = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      // Only log non-noisy events to reduce console spam
      if (event !== 'SIGNED_IN') {
        console.log('[AuthProvider] Auth state changed:', event);
      }

      // Ignore INITIAL_SESSION - it's already handled in the initialization effect above
      // Ignore noisy events that break flows
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        return;
      }

      // Prevent concurrent processing
      if (isProcessing) {
        console.log('[AuthProvider] Already processing, skipping event:', event);
        return;
      }
      
      isProcessing = true;

      try {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          // Avoid duplicate fetch
          if (user?.id === session.user.id) return;

          setSession(session);
          const userData = await fetchUserData(session);
          setUser(userData);
          return;
        }
      } finally {
        isProcessing = false;
        releaseAuthLock();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData, user?.id]);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('[AuthProvider] Error signing out:', error);
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession) {
        setSession(newSession);
        const userData = await fetchUserData(newSession);
        setUser(userData);
      }
    } catch (error) {
      console.error('[AuthProvider] Error refreshing session:', error);
    }
  }, [fetchUserData]);

  // Memoize context value
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut,
    supabase,
    refreshSession,
  }), [user, session, loading, signOut, refreshSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Convenience hooks
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
    role: user?.role || null 
  };
}

// usePermissions is now exported from @/stores/permissions-context
// This avoids duplicate auth calls - permissions-context uses AuthProvider internally