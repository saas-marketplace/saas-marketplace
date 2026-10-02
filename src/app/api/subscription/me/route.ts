import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/subscription/me — the authenticated user's subscription + payments. */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      `id, status, price_tnd, amount_millimes, currency, interval, interval_count,
       current_period_start, current_period_end, next_charge_at,
       cancel_at_period_end, created_at, updated_at, flouci_subscription_id,
       plan:plan_id ( id, name, description, features )`,
    )
    .eq("user_id", user.id)
    .in("status", ["incomplete", "incomplete_expired", "active", "past_due", "unpaid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, flouci_payment_id, amount_tnd, currency, status, billing_reason, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    subscription: subscription ?? null,
    payments: payments ?? [],
    hasActiveAccess: isAccessActive(subscription as any),
  });
}

/**
 * Paid access is granted for [current_period_start, current_period_end) of an
 * active subscription — exactly the period Flouci reports as paid.
 */
function isAccessActive(sub: {
  status?: string;
  current_period_end?: string | null;
} | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end).getTime() > Date.now();
}
