"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

// User role type matching database schema
export type UserRole = "user" | "admin" | "freelancer";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton client instance - prevents multiple instances causing lock issues
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

// Fetch user role from database
async function fetchUserRole(supabase: SupabaseClient, userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return data?.role as UserRole | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  // Fetch role when user changes
  useEffect(() => {
    if (user) {
      fetchUserRole(supabase, user.id).then((userRole) => {
        setRole(userRole);
      });
    } else {
      setRole(null);
    }
  }, [user, supabase]);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session) => {
        if (!mounted) return;
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
          });
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper hook to check if user has required role
export function useHasRole(requiredRoles: UserRole[]) {
  const { role, loading } = useAuth();
  
  return {
    isAuthorized: role ? requiredRoles.includes(role) : false,
    isLoading: loading,
    role,
  };
}
