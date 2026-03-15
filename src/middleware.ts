import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/signup", "/"];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  // Get user with server-side validation (security best practice)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Handle authentication errors
  if (userError || !user) {
    // If not on a public route, redirect to login
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return response;
  }

  // User is authenticated - fetch their role from database
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = userData?.role || null;

  // If user is on root URL and is admin/super_admin, redirect to dashboard
  if (request.nextUrl.pathname === "/" && ["admin", "super_admin"].includes(userRole)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // CRITICAL: Block ALL /dashboard routes for non-admin users
  // Regular users must NEVER access /dashboard
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    // Check if user has admin role
    if (!["admin", "super_admin"].includes(userRole)) {
      // Redirect regular users to home page
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Admin users can access dashboard - allow through
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/auth/:path*",
    "/requests/:path*",
  ],
};
