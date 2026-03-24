import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Get client IP for blocking
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || request.headers.get("x-real-ip")
    || request.ip
    || "unknown";

  // Check if IP is banned
  try {
    const { data: bannedIP } = await supabase
      .from("banned_ips")
      .select("ip_address")
      .eq("ip_address", clientIP)
      .maybeSingle();
    
    if (bannedIP) {
      // Block the request completely
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }
  } catch (error) {
    // Continue on error - don't block legitimate users
  }

  // Helper — carries staged cookies onto any redirect
  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    // Ensure no caching of auth-protected pages
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  };

  // Add cache control headers to prevent caching of auth checks
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Public routes that don't require authentication
  const publicRoutes = [
    "/", 
    "/auth/login", 
    "/auth/signup", 
    "/about", 
    "/pricing", 
    "/contact", 
    "/cookies", 
    "/docs", 
    "/enterprise", 
    "/gdpr", 
    "/help", 
    "/privacy", 
    "/terms", 
    "/blog", 
    "/careers", 
    "/community", 
    "/testimonials", 
    "/freelancers", 
    "/marketplace",
    "/banned",
    "/access-removed",
    "/access-restored"
  ];

  const isPublicRoute = publicRoutes.some(
    route =>
      pathname === route ||
      pathname.startsWith("/blog/") ||
      pathname.startsWith("/freelancers/") ||
      pathname.startsWith("/marketplace/")
  );

  // Get user - redirect to login if not authenticated
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch (error) {
    // On error, redirect to login for protected routes
    if (!isPublicRoute && !pathname.startsWith("/api/")) {
      return redirectTo("/auth/login");
    }
    return response;
  }

  // Check if user is banned - even for public routes
  if (user) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("is_banned")
        .eq("id", user.id)
        .maybeSingle();
      
      if (userData?.is_banned) {
        // Force logout by clearing auth cookies
        response.cookies.set("sb-access-token", "", { maxAge: -1, path: "/" });
        response.cookies.set("sb-refresh-token", "", { maxAge: -1, path: "/" });
        
        // Redirect to banned page
        return redirectTo("/banned");
      }
    } catch (error) {
      // Continue - don't block on error
    }
  }

  // Public routes - allow without auth check
  if (isPublicRoute || pathname.startsWith("/api/")) {
    return response;
  }

  // No user - redirect to login for protected routes
  if (!user) {
    if (!isPublicRoute && !pathname.startsWith("/api/")) {
      return redirectTo("/auth/login");
    }
    return response;
  }

  // ── Authenticated users ─────────────────────────────────────────────────
  // Get user's role and ban status from users table (single query)
  let userRole = "user";
  let isBanned = false;

  try {
    const { data } = await supabase
      .from("users")
      .select("role, is_banned")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data) {
      userRole = data.role || "user";
      isBanned = data.is_banned || false;
    }
  } catch (error) {
    // Continue with default role
  }

  // Check team_members for role_label override (only if needed)
  if (userRole === "admin" || userRole === "super_admin") {
    try {
      const { data: memberData } = await supabase
        .from("team_members")
        .select("role_label")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (memberData?.role_label) {
        if (memberData.role_label === "Super Admin") {
          userRole = "super_admin";
        } else if (memberData.role_label === "Admin") {
          userRole = "admin";
        }
      }
    } catch (error) {
      // Continue with users table role
    }
  }

  // Role-based routing
  // super_admin and admin go to dashboard
  if (userRole === "super_admin" || userRole === "admin") {
    if (pathname === "/") {
      return redirectTo("/dashboard");
    }
    // Prevent access to user management pages for non-super-admin
    if ((pathname.startsWith("/dashboard/users") || pathname.startsWith("/dashboard/contact-submissions")) && userRole !== "super_admin") {
      return redirectTo("/dashboard");
    }
    return response;
  }

  // Regular users stay on home page
  if (userRole === "user") {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/requests")) {
      return redirectTo("/");
    }
    return response;
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
    "/api/:path*",
  ],
};
