import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/public/plans — active subscription plans for the public Plans page. */
export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, description, price_tnd, currency, interval, interval_count, features, active, display_order",
    )
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("price_tnd", { ascending: true });

  if (error) {
    console.error("[api/public/plans] error:", error);
    return NextResponse.json({ error: "Could not load plans" }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}
