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

// Types
type UserRole = "super_admin" | "admin" | "user";
type UserStatus = "active" | "suspended" | "removed" | "restored";

// Function to fetch user role and status from database
// Uses fresh data from DB to avoid caching issues
// Checks both users table AND team_members table to get the correct role
async function getUserStatus(supabase: ReturnType<typeof createClient>, userId: string): Promise<{ role: UserRole; status: UserStatus }> {
  // Fetch role from users table (status might not exist yet)
  const { data: userData, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user:", error);
    return { role: "user", status: "active" };
  }

  let role = userData?.role as UserRole | undefined;
  let status: UserStatus = "active";

  // If role is not set in users table, check team_members table
  if (!role) {
    const { data: memberData } = await supabase
      .from("team_members")
      .select("role_label, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberData?.role_label) {
      // Map role_label to role
      if (memberData.role_label === "Super Admin") {
        role = "super_admin";
      } else if (memberData.role_label === "Admin") {
        role = "admin";
      } else {
        role = "user";
      }
    }

    // Check if team member is active (fallback for status check)
    if (memberData && !memberData.is_active) {
      status = "suspended";
    }
  }

  // Final fallback to user if still undefined
  role = role || "user";

  return { role, status };
}

// Function to determine redirect path based on status and role
function getRedirectPath(status: UserStatus, role: UserRole, returnUrl?: string | null): string {
  // Priority 1: Check status FIRST - redirect to /verify-access for all status issues
  if (status === "removed") {
    return "/verify-access";
  }

  if (status === "suspended") {
    return "/verify-access";
  }

  if (status === "restored") {
    return "/verify-access";
  }

  // Priority 2: If status is "active", check role
  if (status === "active" || status === undefined) {
    // If there's a return URL, respect it
    if (returnUrl && returnUrl !== "/auth/login" && returnUrl !== "/auth/signup") {
      return returnUrl;
    }

    // Check role
    if (role === "admin" || role === "super_admin") {
      return "/dashboard";
    }

    // Regular users go to home
    return "/";
  }

  // Default fallback
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

    // Login successful - fetch user role and status from DB (no caching)
    if (data?.user) {
      const { role, status } = await getUserStatus(supabase, data.user.id);
      
      // Get returnUrl from URL search params
      const returnUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("returnUrl") : null;
      
      const redirectPath = getRedirectPath(status, role, returnUrl);
      
      toast({ title: "Login successful", description: `Welcome back! Redirecting...` });
      router.push(redirectPath);
      router.refresh();
    } else {
      toast({ title: "Login successful", description: "Welcome back!" });
      router.push("/dashboard");
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
              Sign in to your account
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
