"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Home,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ViewState = "loading" | "suspended" | "removed" | "restored" | "active" | "needs_restore";

export default function VerifyAccessPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<ViewState>("loading");
  const [countdown, setCountdown] = useState(3);
  const [isChecking, setIsChecking] = useState(false);

  // Core access check - runs once on mount
  useEffect(() => {
    // Prevent multiple simultaneous checks
    if (isChecking) return;
    setIsChecking(true);

    let isMounted = true;

    const checkAccess = async () => {
      try {
        // 1. Fetch user from Supabase auth
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          router.push("/auth/login");
          return;
        }

        // 2. Fetch role from users table (don't select status - may not exist yet)
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        // 3. Get role and status from team_members table (fallback)
        const { data: memberData } = await supabase
          .from("team_members")
          .select("role_label, is_active, needs_access_restored")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        // Get role - prefer users table, fallback to team_members
        let userRole = userData?.role;
        userRole = userRole || "user";

        // If no team member data (user was removed from team), show removed screen
        if (!memberData) {
          setView("removed");
          return;
        }

        // Check team_members for suspended status
        if (memberData.is_active === false) {
          setView("suspended");
          return;
        }

        // Check team_members for needs_access_restored
        if (memberData && memberData.needs_access_restored === true) {
          // Clear the needs_access_restored flag
          await supabase
            .from("team_members")
            .update({ needs_access_restored: false })
            .eq("user_id", user.id);
          
          setView("restored");
          return;
        }

        // Priority 2: If status is "active", check role
        // Admin/super_admin goes to dashboard
        if (userRole === "admin" || userRole === "super_admin") {
          router.push("/dashboard");
          return;
        }

        // Regular users stay on home
        if (userRole === "user") {
          router.push("/");
          return;
        }

        // Default: redirect to home
        router.push("/");
      } catch (error) {
        if (!isMounted) return;
        console.error("Error checking access:", error);
        // On error, show removed screen
        setView("removed");
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [supabase, router]);

  // Countdown for restored state
  useEffect(() => {
    if (view !== "restored") return;

    // If countdown is still at initial value (3), start at 2
    if (countdown >= 3) {
      setCountdown(2);
      return;
    }

    // When countdown reaches 0, redirect
    if (countdown === 0) {
      window.location.href = "/dashboard";
      return;
    }

    // Countdown from 2 to 0
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [view, countdown]);

  const handleManualCheck = () => {
    router.refresh();
    window.location.reload();
  };

  const handleBackHome = () => {
    router.push("/");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Loading state
  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">
            Verifying your access…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <AnimatePresence mode="wait">
        {/* ── Restored Screen ── */}
        {view === "restored" && (
          <motion.div
            key="restored"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-slate-900 dark:text-white mb-3"
            >
              Access Restored!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-600 dark:text-slate-400 mb-6"
            >
              Your access has been restored. You'll be redirected to your
              dashboard shortly.
            </motion.p>

            {countdown > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-blue-600 dark:text-blue-400 mb-6"
              >
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}…
              </motion.p>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => router.push("/dashboard")}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 inline-flex items-center"
            >
              Go to Dashboard Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
          </motion.div>
        )}

        {/* ── Suspended Screen ── */}
        {view === "suspended" && (
          <motion.div
            key="suspended"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
            >
              <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-slate-900 dark:text-white mb-3"
            >
              Account Suspended
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-600 dark:text-slate-400 mb-4"
            >
              Your account is suspended. Please contact your administrator.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-sm text-slate-500 dark:text-slate-400 mb-6"
            >
              Contact your administrator to restore access.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button
                onClick={handleManualCheck}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 inline mr-2" />
                Check Now
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <Home className="w-5 h-5 inline mr-2" />
                Sign Out
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Removed Screen ── */}
        {view === "removed" && (
          <motion.div
            key="removed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-slate-900 dark:text-white mb-3"
            >
              Access Removed
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-600 dark:text-slate-400 mb-4"
            >
              Your access has been removed from the team.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-sm text-slate-500 dark:text-slate-400 mb-6"
            >
              Please contact your administrator for further assistance.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <Home className="w-5 h-5 inline mr-2" />
                Sign Out
              </button>
              <button
                onClick={handleBackHome}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <Home className="w-5 h-5 inline mr-2" />
                Back to Home
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
