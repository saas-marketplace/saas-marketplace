"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Role type matching database schema - roles stored in users table
type UserRole = "super_admin" | "admin" | "user" | null;

// Function to fetch user role and access status from database
// Fetches from users table for role and team_members for team member status
// Uses fresh data from DB to avoid caching issues
async function getUserStatus(supabase: ReturnType<typeof createClient>, userId: string): Promise<{ isAdmin: boolean; isTeamMember: boolean; isRemoved: boolean; needsAccessRestored: boolean }> {
  // Fetch role from users table
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("Error fetching user role:", userError);
    return { isAdmin: false, isTeamMember: false, isRemoved: true, needsAccessRestored: false };
  }

  const userRole = userData?.role as UserRole;

  // Check if user is admin or super_admin
  if (userRole === "super_admin" || userRole === "admin") {
    return { isAdmin: true, isTeamMember: false, isRemoved: false, needsAccessRestored: false };
  }

  // Check if user exists in team_members table
  const { data: teamMember, error: tmError } = await supabase
    .from("team_members")
    .select("needs_access_restored, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (tmError) {
    console.error("Error fetching team member:", tmError);
  }

  // If no team member record, user is a removed team member
  if (!teamMember) {
    return { isAdmin: false, isTeamMember: false, isRemoved: true, needsAccessRestored: false };
  }

  // If team member exists and is active, check if they need access restored
  const isTeamMember = teamMember.is_active === true;
  const needsAccessRestored = teamMember.needs_access_restored === true && teamMember.is_active === true;

  return { isAdmin: false, isTeamMember, isRemoved: false, needsAccessRestored };
}

// Function to determine redirect path based on role
// Also checks if user needs to verify access
function getRedirectPath(isAdmin: boolean, isTeamMember: boolean, isRemoved: boolean, needsAccessRestored: boolean, returnUrl?: string | null): string {
  // If user needs to verify access (reactivated team member), redirect there first
  if (needsAccessRestored) {
    return "/verify-access";
  }

  // If there's a return URL, respect it for all users (except removed users)
  if (returnUrl && returnUrl !== "/auth/login" && returnUrl !== "/auth/signup" && !isRemoved) {
    return returnUrl;
  }

  // Removed team members go to verify-access (shows removed alert)
  if (isRemoved) {
    return "/verify-access";
  }

  // Admin or team member goes to dashboard
  if (isAdmin || isTeamMember) {
    return "/dashboard";
  }

  // Regular users go to home page
  return "/";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({ title: "Login failed", description: error.message });
      setLoading(false);
      return;
    }

    // Login successful - fetch user role and access status from DB (no caching)
    if (data?.user) {
      const { isAdmin, isTeamMember, isRemoved, needsAccessRestored } = await getUserStatus(supabase, data.user.id);
      
      // Get returnUrl from URL search params (set by middleware when redirecting to login)
      const returnUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("returnUrl") : null;
      
      const redirectPath = getRedirectPath(isAdmin, isTeamMember, isRemoved, needsAccessRestored, returnUrl);
      if (redirectPath !== "/dashboard") {
          router.push(redirectPath);
          router.refresh();
        } else {
          toast({ title: "Login successful", description: "Welcome back!" });
          router.push("/dashboard");
        }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 pb-16 bg-white dark:bg-black">
      <div className="absolute inset-0 gradient-bg-subtle" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        <div className="glass-card rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to your Milit Company account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gradient-bg text-white border-0 hover:opacity-90 rounded-xl"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

