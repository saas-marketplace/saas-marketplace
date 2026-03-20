import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Helper — carries staged cookies onto any redirect
  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Unauthenticated users ─────────────────────────────────────────────────
  if (!user) {
    // Allow access to public routes
    const publicRoutes = ["/", "/auth/login", "/auth/signup", "/about", "/pricing", "/contact", "/cookies", "/docs", "/enterprise", "/gdpr", "/help", "/privacy", "/terms", "/blog", "/careers", "/community", "/testimonials", "/freelancers", "/marketplace"];
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith("/blog/") || pathname.startsWith("/freelancers/") || pathname.startsWith("/marketplace/"));
    
    if (isPublicRoute || pathname.startsWith("/api/")) {
      return response;
    }
    
    // Redirect to login for protected routes, preserving the intended destination
    const returnUrl = pathname;
    return redirectTo(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  // ── Authenticated users ─────────────────────────────────────────────────
  
  // If already on verify/access pages, let them through
  if (pathname === "/verify-access" || pathname === "/access-removed" || pathname === "/access-restored") {
    return response;
  }

  // Fetch user's role from users table
  // Also check team_members table as fallback for role and status
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  let userRole = userData?.role || "user";
  let userStatus = "active";

  // Check team_members for role and status fallback
  const { data: memberData } = await supabase
    .from("team_members")
    .select("role_label, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  // If role is not set in users table, use team_members role_label
  if (!userData?.role && memberData?.role_label) {
    if (memberData.role_label === "Super Admin") {
      userRole = "super_admin";
    } else if (memberData.role_label === "Admin") {
      userRole = "admin";
    }
  }

  // Fallback: check team_members.is_active for suspended status
  if (memberData && memberData.is_active === false) {
    userStatus = "suspended";
  }

  // Priority 1: Check status FIRST - redirect to /verify-access for all status issues
  if (userStatus === "removed") {
    return redirectTo("/verify-access");
  }

  if (userStatus === "suspended") {
    return redirectTo("/verify-access");
  }

  if (userStatus === "restored") {
    return redirectTo("/verify-access");
  }

  // Priority 2: If status is "active", check role
  if (userStatus === "active") {
    // Admin or super_admin goes to dashboard
    if (userRole === "admin" || userRole === "super_admin") {
      if (pathname === "/") {
        return redirectTo("/dashboard");
      }
      return response;
    }

    // Regular users (role = "user") stay on home
    if (userRole === "user") {
      if (pathname.startsWith("/dashboard") || pathname.startsWith("/requests")) {
        return redirectTo("/");
      }
      return response;
    }
  }

  // Default: allow navigation
  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/auth/:path*",
    "/requests/:path*",
    "/verify-access",
    "/access-restored",
    "/access-removed",
  ],
};
