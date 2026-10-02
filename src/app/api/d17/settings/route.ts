import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/d17/settings
 *
 * Public endpoint that returns ONLY the D17 receiving number, read from
 * system_settings on the server. It is never hardcoded in the frontend and
 * regular users cannot change it — updating it goes through the
 * super-admin-only /api/system-settings PATCH.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing service role configuration");

    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: setting } = await db
      .from("system_settings")
      .select("value")
      .eq("key", "d17_receiving_number")
      .maybeSingle();

    let receivingNumber = "+216 28163762";
    if (setting?.value) {
      try {
        const parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
        if (typeof parsed === "string" && parsed.trim()) receivingNumber = parsed.trim();
      } catch {
        /* keep default */
      }
    }

    return NextResponse.json({ receivingNumber });
  } catch (error) {
    console.error("[api/d17/settings] GET error:", error);
    return NextResponse.json({ receivingNumber: "+216 28163762" });
  }
}
