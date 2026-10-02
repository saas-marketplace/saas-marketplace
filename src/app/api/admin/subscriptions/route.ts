import { NextResponse } from "next/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/subscriptions — monitor all subscriptions (super admin). */
export async function GET() {
  const admin = await getAuthedAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin.supabase
    .from("subscriptions")
    .select(
      `id, user_id, status, price_tnd, amount_millimes, currency, interval, interval_count,
       flouci_subscription_id, developer_tracking_id, current_period_start, current_period_end,
       next_charge_at, cancel_at_period_end, created_at, updated_at,
       plan:plan_id ( name ),
       user:user_id ( email, full_name )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data ?? [] });
}
