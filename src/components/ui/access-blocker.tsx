"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// AccessBlocker wraps children and handles access control on the client side
// Checks for banned status and redirects immediately
export function AccessBlocker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Skip check for banned page itself to prevent loops
    if (pathname === "/banned" || pathname === "/access-restored") {
      return;
    }

    const checkBanStatus = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          return; // Not logged in, let other components handle auth
        }

        // Check if user is banned in database
        const { data: userData } = await supabase
          .from("users")
          .select("is_banned")
          .eq("id", session.user.id)
          .maybeSingle();

        if (userData?.is_banned) {
          // Force logout
          await supabase.auth.signOut();
          // Redirect to banned page
          router.replace("/banned");
        }
      } catch (error) {
        console.error("Error checking ban status:", error);
      }
    };

    checkBanStatus();
  }, [pathname, router, supabase]);

  return <>{children}</>;
}

// Kept for backwards compatibility
export function AccessRemovedScreen() {
  return null;
}
