import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/d17/payments
 *
 * Returns the authenticated user's D17 payment submissions
 * (used for the home-page payment status cards).
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("d17_payments")
      .select(
        "id, product_id, product_name, amount, currency, status, rejection_reason, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ payments: data ?? [] });
  } catch (error) {
    console.error("[api/d17/payments] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch D17 payments" },
      { status: 500 }
    );
  }
}
