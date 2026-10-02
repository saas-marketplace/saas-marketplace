import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          } catch {
            // Server Component cookie handling
          }
        },
      },
    }
  );
}

/**
 * Service-role client: bypasses RLS entirely.
 *
 * Server-only — never import this into a "use client" file or return it from a
 * route handler. Every caller MUST authorise the request itself first (see
 * getAuthedAdmin) so that skipping RLS does not become skipping authorisation.
 *
 * Used for writes to tables whose RLS policies are SELECT-only, which would
 * otherwise reject every INSERT/UPDATE/DELETE.
 */
export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
