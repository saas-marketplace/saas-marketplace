import { createBrowserClient } from "@supabase/ssr";

// Singleton client to prevent lock issues in React Strict Mode
let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) {
    return client;
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}

// Export a singleton supabase client instance for use in client components
export const supabase = createClient();
