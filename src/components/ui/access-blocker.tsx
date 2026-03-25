"use client";

/**
 * access-blocker.tsx
 * ══════════════════
 * Redirects banned users to /banned.
 *
 * ✅ No getSession() / users table query — reads isBanned from AuthProvider cache.
 * ✅ Runs zero DB queries. The users row is already fetched once by useAuthUser.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export function AccessBlocker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Skip check on exempt pages
    if (pathname === "/banned" || pathname === "/access-restored") return;
    // Wait for auth to resolve
    if (loading) return;
    // If the user is flagged as banned in the cached data — redirect
    if (user?.isBanned) {
      router.replace("/banned");
    }
  }, [user, loading, pathname, router]);

  return <>{children}</>;
}

// Kept for backwards compatibility
export function AccessRemovedScreen() {
  return null;
}