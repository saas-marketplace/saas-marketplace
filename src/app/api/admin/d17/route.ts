import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedAdmin } from "@/lib/api-auth";
import { sendD17PaymentSuccessEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

/**
 * Admin D17 submissions API.
 *
 * GET   /api/admin/d17        — list every D17 submission
 * PATCH /api/admin/d17        — { id, action: "received" | "rejected", rejectionReason? }
 *
 * Only authenticated admins (users.role admin / super_admin) may access this.
 * Normal users can never mark their own payment as received: this route is the
 * only place the status can change, and it requires an admin session.
 *
 * "received" side effects (all duplicate-guarded):
 *   1. status: pending → received (atomic conditional update)
 *   2. a completed order is created once (payment_reference = "d17_<id>")
 *   3. an in-app notification is inserted for the user
 *   4. a confirmation email is sent to the customer
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role configuration");
  return createClient(url, key, { auth: { persistSession: false } });
}

const SELECT_COLUMNS =
  "id, user_id, product_id, product_name, amount, quantity, currency, d17_sender_number, d17_receiving_number, customer_email, status, rejection_reason, order_id, deliverable_sent_at, deliverable_file_name, verified_at, verified_by, delivered_at, created_at, updated_at, user:users!d17_payments_user_id_fkey ( email, full_name )";

// GET ─ list submissions ──────────────────────────────────────────────────────
export async function GET() {
  const admin = await getAuthedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("d17_payments")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/admin/d17] GET error:", error);
    return NextResponse.json({ error: "Failed to load D17 submissions" }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
}

// PATCH ─ mark received / reject ──────────────────────────────────────────────
export async function PATCH(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; action?: string; rejectionReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, action, rejectionReason } = body;
  if (!id || (action !== "received" && action !== "rejected")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "rejected" && rejectionReason != null && typeof rejectionReason !== "string") {
    return NextResponse.json({ error: "Invalid rejection reason" }, { status: 400 });
  }

  const db = serviceClient();
  const now = new Date().toISOString();

  // Load the submission first (needed for the user notification / email).
  const { data: submission, error: loadError } = await db
    .from("d17_payments")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (loadError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (action === "rejected") {
    // Only pending submissions can be rejected.
    const { data: rejected, error: rejectError } = await db
      .from("d17_payments")
      .update({
        status: "rejected",
        rejection_reason: (rejectionReason ?? "").trim() || "Payment not confirmed.",
        verified_at: now,
        verified_by: admin.user.id,
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select(SELECT_COLUMNS)
      .maybeSingle();

    if (rejectError || !rejected) {
      return NextResponse.json(
        { error: "Submission was already processed or could not be updated." },
        { status: 409 }
      );
    }

    // Inform the user the payment was not confirmed.
    if (submission.user_id) {
      await db.from("notifications").insert({
        user_id: submission.user_id,
        type: "payment",
        title: "D17 Payment Not Confirmed",
        message: `We could not confirm your D17 payment for "${submission.product_name}". Reason: ${rejected.rejection_reason
          }. You can submit the payment again.`,
        link: "/",
      });
    }

    return NextResponse.json({ submission: rejected });
  }

  // ── action === "received" ────────────────────────────────────────────────
  // 1. Atomic status change — if it affects 0 rows the submission was already
  //    processed (double click / two admins at once), so stop here.
  const { data: received, error: updateError } = await db
    .from("d17_payments")
    .update({
      status: "received",
      rejection_reason: null,
      verified_at: now,
      verified_by: admin.user.id,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (updateError || !received) {
    return NextResponse.json(
      { error: "Payment was already processed." },
      { status: 409 }
    );
  }

  const userId = submission.user_id;
  let orderCreated = false;

  if (userId) {
    // 2. Create the paid order exactly once (payment_reference = "d17_<id>").
    const paymentReference = `d17_${id}`;
    const { data: existingOrder } = await db
      .from("orders")
      .select("id")
      .eq("payment_reference", paymentReference)
      .maybeSingle();

    let orderId: string | null = existingOrder?.id ?? null;

    if (!orderId) {
      const { data: order, error: orderError } = await db
        .from("orders")
        .insert({
          user_id: userId,
          payment_provider: "d17",
          payment_reference: paymentReference,
          status: "completed",
          total_amount: Number(submission.amount),
          currency: "TND",
          items: [
            {
              product_id: submission.product_id,
              title: submission.product_name,
              amount: Number(submission.amount),
              d17_submission_id: id,
            },
          ],
          customer_email: submission.customer_email,
          paid_at: now,
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("[api/admin/d17] order creation failed:", orderError);
      } else {
        orderId = order.id;
        orderCreated = true;
      }
    }

    // Record the delivery marker on the submission.
    await db
      .from("d17_payments")
      .update({ order_id: orderId, delivered_at: orderCreated ? now : (submission as any).delivered_at ?? now, updated_at: now })
      .eq("id", id);

    // 3. In-app notification — always (the status card on the home page reads it).
    // This is the ONLY place a D17 approval surfaces for the customer: the
    // navbar bell in NotificationBell renders from this same table.
    await db.from("notifications").insert({
      user_id: userId,
      type: "payment",
      title: "Payment Successful ✅",
      message: `Your payment for "${submission.product_name}" (${Number(submission.amount)} ${submission.currency}) has been successfully verified on ${new Date(now).toLocaleString("en-GB")}. Your product is ready — check your account for the delivery details.`,
      link: "/profile",
    });

    // 4. Confirmation email — best effort, never blocks the response.
    if (submission.customer_email) {
      const result = await sendD17PaymentSuccessEmail({
        toEmail: submission.customer_email,
        productName: submission.product_name,
        amount: Number(submission.amount),
      });
      if (!result.success) {
        console.error("[api/admin/d17] confirmation email failed:", result.error);
      }
    }
  }

  // Re-read the final row to return fresh data.
  const { data: final } = await db
    .from("d17_payments")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({ submission: final ?? received, orderCreated });
}
