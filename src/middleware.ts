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
    
    // Redirect to login for protected routes
    return redirectTo("/auth/login");
  }

  // ── Authenticated users ───────────────────────────────────────────────────
  
  // Check if user needs access restored
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("needs_access_restored")
    .eq("user_id", user.id)
    .maybeSingle();

  // If on /verify-access and needs_access_restored is false, redirect to dashboard
  // This prevents stuck states and manual access
  if (pathname === "/verify-access" && teamMember?.needs_access_restored !== true) {
    return redirectTo("/dashboard");
  }

  // If needs_access_restored is true and not on verify-access, redirect to verify-access
  if (pathname !== "/verify-access" && teamMember?.needs_access_restored === true) {
    return redirectTo("/verify-access");
  }

  // Otherwise, allow normal navigation (NO redirect back to verify-access)
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
