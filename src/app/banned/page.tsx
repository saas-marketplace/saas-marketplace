"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BannedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [actuallyBanned, setActuallyBanned] = useState(true);

  useEffect(() => {
    // Check if user is actually still banned (handles cached sessions after unban)
    const checkBanStatus = async () => {
      try {
        // First, refresh the session to get fresh user data
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error("Error refreshing session:", refreshError);
        }
        
        if (!session?.user) {
          // No session, user is logged out - they're not banned, just logged out
          router.push("/");
          return;
        }
        
        // Check the database for the actual ban status (fresh query, not cached)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_banned")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (userError) {
          console.error("Error checking ban status:", userError);
        }
        
        // If user data exists and is_banned is false, they've been unbanned
        if (userData && userData.is_banned === false) {
          setActuallyBanned(false);
          router.push("/access-restored");
          return;
        }
        
        // User is actually banned, sign them out and show the banned page
        await supabase.auth.signOut();
        setActuallyBanned(true);
      } catch (error) {
        console.error("Error checking ban status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkBanStatus();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Checking account status...</p>
        </div>
      </div>
    );
  }

  if (!actuallyBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
              Access Restored
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
              Your account has been restored.
            </p>
            <p className="text-slate-500 dark:text-slate-500 mb-8">
              You can now access the platform again.
            </p>
          </div>
          <Button
            onClick={() => router.push("/")}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleGoHome = () => {
    router.push("/");
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@militcompany.com?subject=Account Ban Appeal";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
            Account Banned
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            Your account has been suspended by the administrator.
          </p>
          
          <p className="text-slate-500 dark:text-slate-500 mb-8">
            You are no longer able to access this platform. Please contact support for more information.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleContactSupport}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
          
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="w-full h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </div>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-600">
          If you believe this is an error, please contact our support team.
        </p>
      </div>
    </div>
  );
}
