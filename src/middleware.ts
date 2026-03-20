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
  
  // If already on /verify-access, let them through (page handles logic)
  if (pathname === "/verify-access") {
    return response;
  }

  // Fetch user's role from database (not cached)
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = userData?.role ?? null;
  const isAdmin = userRole === "super_admin" || userRole === "admin";

  // Admins and super admins always go to dashboard
  if (isAdmin) {
    // If trying to access root, redirect to dashboard
    if (pathname === "/") {
      return redirectTo("/dashboard");
    }
    return response;
  }

  // Check team_members table for team member status
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("needs_access_restored, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  // If no team member record, user is a regular user - redirect to home
  if (!teamMember) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/requests")) {
      return redirectTo("/");
    }
    return response;
  }

  // If needs_access_restored is true and user is active, redirect to /verify-access
  if (teamMember.needs_access_restored === true && teamMember.is_active === true) {
    return redirectTo("/verify-access");
  }

  // If team member is suspended, redirect to /verify-access (which will show suspended screen)
  if (teamMember.is_active === false) {
    return redirectTo("/verify-access");
  }

  // If user is on root, redirect team members to dashboard
  if (pathname === "/") {
    return redirectTo("/dashboard");
  }

  // Otherwise, allow normal navigation
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
    "/suspended-access",
    "/access-removed",
  ],
};
