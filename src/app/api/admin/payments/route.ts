import { NextResponse } from "next/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/payments — monitor all payments (super admin). */
export async function GET() {
  const admin = await getAuthedAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin.supabase
    .from("payments")
    .select(
      `id, user_id, flouci_payment_id, flouci_subscription_id, developer_tracking_id,
       amount_millimes, amount_tnd, currency, status, payment_type, billing_reason,
       settlement_status, amount_verified, created_at,
       subscription:subscription_id ( plan_id, plan:plan_id ( name ) ),
       user:user_id ( email, full_name )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data ?? [] });
}
