import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Check if a user is banned
 * Returns the user object if not banned, null if banned or error
 */
export async function checkUserBanned(): Promise<{
  user: import("@supabase/supabase-js").User | null;
  isBanned: boolean;
}> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, isBanned: false };
    }

    // Check if user is banned
    const { data: userData } = await supabase
      .from("users")
      .select("is_banned")
      .eq("id", user.id)
      .maybeSingle();

    return {
      user,
      isBanned: userData?.is_banned === true,
    };
  } catch (error) {
    console.error("Error checking user banned status:", error);
    return { user: null, isBanned: false };
  }
}

/**
 * Require a valid authenticated user (not banned)
 * Returns the user or responds with error
 */
export async function requireAuth(): Promise<{
  user: import("@supabase/supabase-js").User;
}> {
  const { user, isBanned } = await checkUserBanned();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (isBanned) {
    throw new Error("Banned");
  }

  return { user };
}
