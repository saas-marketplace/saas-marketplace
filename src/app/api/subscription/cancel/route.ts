import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/flouci";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscription/cancel
 * Body: { atPeriodEnd: boolean }
 *
 * Cancels through Flouci's official cancellation API
 * (POST /api/v2/subscriptions/{id}/cancel) — never just a local DB change.
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { atPeriodEnd?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const atPeriodEnd = Boolean(body?.atPeriodEnd);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, flouci_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "incomplete"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.flouci_subscription_id) {
    return NextResponse.json({ error: "No cancellable subscription found." }, { status: 404 });
  }

  const result = await cancelSubscription(sub.flouci_subscription_id, atPeriodEnd);

  if (!result.ok) {
    const message = result.data?.message || `Flouci cancellation failed (HTTP ${result.status})`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const r = result.data?.result ?? {};

  // Mirror Flouci's response locally; the webhook remains authoritative.
  await supabase
    .from("subscriptions")
    .update({
      status: r.status ?? sub.status,
      cancel_at_period_end: Boolean(r.cancel_at_period_end ?? atPeriodEnd) && (r.status ?? "") !== "canceled",
      cancellation_reason: r.cancellation_reason ?? null,
      next_charge_at: r.next_charge_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  return NextResponse.json({
    status: r.status ?? null,
    cancel_at_period_end: Boolean(r.cancel_at_period_end ?? atPeriodEnd),
  });
}
