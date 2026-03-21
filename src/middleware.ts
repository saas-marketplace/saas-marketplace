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

  // Helper — carries staged cookies onto any redirect
  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

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
    "/marketplace"
  ];

  const isPublicRoute = publicRoutes.some(
    route =>
      pathname === route ||
      pathname.startsWith("/blog/") ||
      pathname.startsWith("/freelancers/") ||
      pathname.startsWith("/marketplace/")
  );

  // Public routes - allow without auth check
  if (isPublicRoute || pathname.startsWith("/api/")) {
    return response;
  }

  // Try to get user - don't redirect if it fails
  let user = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch (error) {
    // Allow request to continue on error
    return response;
  }

  // No user - let frontend handle
  if (!user) {
    return response;
  }

  // ── Authenticated users ─────────────────────────────────────────────────
  // NEVER redirect suspended users - let them access dashboard and show UI message
  
  // Get user's role from users table
  let userRole = "user";

  try {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data?.role) {
      userRole = data.role;
    }
  } catch (error) {
    // Continue with default role
  }

  // Check team_members for role_label override
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

  // Role-based routing
  // super_admin and admin go to dashboard
  if (userRole === "super_admin" || userRole === "admin") {
    if (pathname === "/") {
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
  ],
};
