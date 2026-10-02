import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, tndToMillimes, verifyPayment } from "@/lib/flouci";

export const dynamic = "force-dynamic";

/**
 * POST /api/flouci/webhook
 *
 * Receives signed Flouci events:
 *   - Recurring subscription events: JSON POST with X-Flouci-Event /
 *     X-Flouci-Signature (HMAC-SHA256 over "<t>.<rawBody>", verified below).
 *   - One-off payments also call this URL; they are verified with
 *     GET /api/v2/verify_payment/{payment_id} instead of a signature.
 *
 * Steps: verify → validate → store event (dedup by event_id) → 200 quickly →
 * process subscription changes.
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role configuration");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  // Legacy one-off payment webhook: Flouci redirects with payment_id & success.
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id");
  if (!paymentId) return NextResponse.json({ received: true });

  const verified = await verifyPayment(paymentId);
  if (verified.success) {
    await recordPaymentVerified(serviceClient(), paymentId, verified);
  }
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const eventHeader = request.headers.get("X-Flouci-Event");
  const signatureHeader = request.headers.get("X-Flouci-Signature");

  // ── 1. Verify signature (constant-time, raw body, tolerance window) ────────
  const check = verifyWebhookSignature(rawBody, signatureHeader);
  if (!check.valid) {
    console.warn("[api/flouci/webhook] signature rejected:", check.reason);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 2. Validate event ──────────────────────────────────────────────────────
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const eventId: string | undefined = event?.event_id;
  const eventType: string | undefined =
    event?.event ?? event?.type ?? eventHeader ?? undefined;
  const data = event?.data ?? event?.result ?? {};

  if (!eventId || !eventType) {
    return NextResponse.json({ error: "Event missing event_id or type" }, { status: 400 });
  }

  const db = serviceClient();

  // ── 3. Store event — de-duplicate by event_id ──────────────────────────────
  const { data: existing } = await db
    .from("flouci_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Already delivered — acknowledge without processing again.
    return NextResponse.json({ received: true, duplicate: true });
  }

  await db.from("flouci_webhook_events").insert([
    {
      event_id: eventId,
      event: eventType,
      subscription_id: data?.subscription?.subscription_id ?? data?.subscription_id ?? null,
      payment_id: data?.payment?.payment_id ?? data?.payment_id ?? null,
      payload: event,
      processing_status: "received",
    },
  ]);

  // ── 4. Acknowledge quickly; processing continues below ─────────────────────
  try {
    await processSubscriptionEvent(db, eventType, data);
    await db
      .from("flouci_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_status: "processed" })
      .eq("event_id", eventId);
  } catch (err) {
    console.error("[api/flouci/webhook] processing error:", err);
    await db
      .from("flouci_webhook_events")
      .update({ processing_status: "failed" })
      .eq("event_id", eventId);
  }

  return NextResponse.json({ received: true });
}

// ─── Event handling ──────────────────────────────────────────────────────────

function mapFlouciStatus(flouciStatus: string | undefined): string {
  switch (flouciStatus) {
    case "incomplete":
    case "incomplete_expired":
    case "active":
    case "past_due":
    case "unpaid":
    case "canceled":
      return flouciStatus;
    default:
      return flouciStatus ?? "incomplete";
  }
}

async function findSubscription(
  db: ReturnType<typeof serviceClient>,
  flouciSubscriptionId: string | undefined,
  developerTrackingId: string | undefined,
) {
  if (flouciSubscriptionId) {
    const { data } = await db
      .from("subscriptions")
      .select("*")
      .eq("flouci_subscription_id", flouciSubscriptionId)
      .maybeSingle();
    if (data) return data;
  }
  if (developerTrackingId) {
    const { data } = await db
      .from("subscriptions")
      .select("*")
      .eq("developer_tracking_id", developerTrackingId)
      .maybeSingle();
    return data;
  }
  return null;
}

/**
 * Records a verified charge and — when it succeeded — extends access using the
 * Flouci-provided billing period.
 */
async function recordCharge(
  db: ReturnType<typeof serviceClient>,
  sub: any,
  payment: {
    paymentId: string;
    amountMillimes: number | null;
    status: string;
    type?: string | null;
    billingReason?: string | null;
    settlementStatus?: string | null;
  },
  _period: { start?: string | null; end?: string | null } = {},
  amountVerified = false,
) {
  const expected = sub?.amount_millimes ? Number(sub.amount_millimes) : null;
  const mismatch =
    amountVerified && payment.amountMillimes != null && expected != null && payment.amountMillimes !== expected;

  if (mismatch) {
    console.error(
      `[api/flouci/webhook] AMOUNT MISMATCH for payment ${payment.paymentId}: verified=${payment.amountMillimes} expected=${expected}`,
    );
  }

  await db.from("payments").upsert(
    {
      user_id: sub?.user_id ?? null,
      subscription_id: sub?.id ?? null,
      plan_id: sub?.plan_id ?? null,
      flouci_payment_id: payment.paymentId,
      flouci_subscription_id: sub?.flouci_subscription_id ?? null,
      developer_tracking_id: sub?.developer_tracking_id ?? null,
      amount_millimes: payment.amountMillimes ?? expected ?? 0,
      amount_tnd: (payment.amountMillimes ?? expected ?? 0) / 1000,
      currency: "TND",
      status: payment.status,
      payment_type: payment.type ?? null,
      billing_reason: payment.billingReason ?? null,
      settlement_status: payment.settlementStatus ?? null,
      amount_verified: amountVerified && !mismatch,
      verified_at: amountVerified ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "flouci_payment_id" },
  );

  return { mismatch };
}

async function applyPeriod(
  db: ReturnType<typeof serviceClient>,
  sub: any,
  status: string,
  period: { start?: string | null; end?: string | null },
  nextChargeAt?: string | null,
) {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (period.start) patch.current_period_start = period.start;
  if (period.end) patch.current_period_end = period.end;
  if (nextChargeAt !== undefined) patch.next_charge_at = nextChargeAt;

  await db.from("subscriptions").update(patch).eq("id", sub.id);
}

async function recordPaymentVerified(
  db: ReturnType<typeof serviceClient>,
  paymentId: string,
  verified: {
    amount?: number;
    developerTrackingId?: string | null;
    subscriptionId?: string | null;
    billingReason?: string | null;
    settlementStatus?: string | null;
    type?: string;
  },
) {
  const sub = await findSubscription(db, verified.subscriptionId ?? undefined, verified.developerTrackingId ?? undefined);
  await recordCharge(
    db,
    sub,
    {
      paymentId,
      amountMillimes: verified.amount ?? null,
      status: "SUCCESS",
      type: verified.type,
      billingReason: verified.billingReason,
      settlementStatus: verified.settlementStatus,
    },
    {},
    true,
  );
}

async function processSubscriptionEvent(
  db: ReturnType<typeof serviceClient>,
  eventType: string,
  data: any,
) {
  const flouciSubscriptionId: string | undefined =
    data?.subscription?.subscription_id ?? data?.subscription_id;
  const developerTrackingId: string | undefined =
    data?.subscription?.developer_tracking_id ?? data?.developer_tracking_id;

  const sub = await findSubscription(db, flouciSubscriptionId, developerTrackingId);
  if (!sub) {
    console.warn("[api/flouci/webhook] event for unknown subscription", flouciSubscriptionId);
    return;
  }

  const paymentInfo = data?.payment ?? {};
  const paymentId: string | undefined = paymentInfo.payment_id ?? data?.payment_id;
  const period = {
    start: data?.current_period_start ?? data?.subscription?.current_period_start,
    end: data?.current_period_end ?? data?.subscription?.current_period_end,
  };
  const nextChargeAt = data?.next_charge_at ?? data?.subscription?.next_charge_at;

  switch (eventType) {
    case "subscription.activated": {
      // First payment succeeded — verify it before granting access.
      if (paymentId) {
        const verified = await verifyPayment(paymentId);
        if (!verified.success) {
          await recordCharge(db, sub, { paymentId, amountMillimes: verified.amount ?? null, status: verified.status ?? "FAILURE" });
          return;
        }
        const { mismatch } = await recordCharge(
          db,
          sub,
          {
            paymentId,
            amountMillimes: verified.amount,
            status: "SUCCESS",
            type: verified.type,
            billingReason: verified.billingReason,
            settlementStatus: verified.settlementStatus,
          },
          period,
          true,
        );
        if (mismatch) return; // flagged — do not extend access on a mismatched amount
      }
      await applyPeriod(db, sub, "active", period, nextChargeAt ?? null);
      await db
        .from("subscriptions")
        .update({ latest_payment_id: paymentId ?? sub.latest_payment_id })
        .eq("id", sub.id);
      return;
    }

    case "subscription.charge.succeeded": {
      // First payment or renewal — verify the charge, then extend the period.
      let amountVerified = false;
      let amount: number | null = paymentInfo.amount ?? null;
      let status: string = paymentInfo.status ?? "SUCCESS";
      if (paymentId) {
        const verified = await verifyPayment(paymentId);
        amount = verified.amount ?? amount;
        status = verified.status ?? status;
        amountVerified = verified.success;
      }
      if (amountVerified && status !== "SUCCESS") return;

      const { mismatch } = await recordCharge(
        db,
        sub,
        {
          paymentId: paymentId ?? `unknown_${Date.now()}`,
          amountMillimes: amount,
          status: "SUCCESS",
          type: paymentInfo.type ?? null,
          billingReason: paymentInfo.billing_reason ?? null,
          settlementStatus: paymentInfo.settlement_status ?? null,
        },
        period,
        amountVerified,
      );
      if (mismatch) return;
      await applyPeriod(db, sub, "active", period, nextChargeAt ?? null);
      await db
        .from("subscriptions")
        .update({ latest_payment_id: paymentId ?? sub.latest_payment_id })
        .eq("id", sub.id);
      return;
    }

    case "subscription.charge.failed": {
      const flouciStatus = mapFlouciStatus(data?.subscription?.status ?? paymentInfo.status);
      if (paymentId) {
        await recordCharge(db, sub, {
          paymentId,
          amountMillimes: paymentInfo.amount ?? null,
          status: "FAILURE",
          type: paymentInfo.type ?? null,
          billingReason: paymentInfo.billing_reason ?? null,
          settlementStatus: paymentInfo.settlement_status ?? null,
        });
      }
      // past_due keeps the paid period; retries are handled by Flouci.
      await applyPeriod(
        db,
        sub,
        flouciStatus === "canceled" ? "canceled" : "past_due",
        period,
        data?.next_retry_at ?? null,
      );
      return;
    }

    case "subscription.past_due": {
      await applyPeriod(db, sub, "past_due", period, nextChargeAt ?? null);
      return;
    }

    case "subscription.reactivated": {
      await applyPeriod(db, sub, "active", period, nextChargeAt ?? null);
      return;
    }

    case "subscription.unpaid": {
      await applyPeriod(db, sub, "unpaid", period, null);
      return;
    }

    case "subscription.completed": {
      // max_cycles reached — access lasts until the final paid period ends.
      const patch: Record<string, unknown> = { status: "canceled", updated_at: new Date().toISOString() };
      if (period.end) patch.current_period_end = period.end;
      await db
        .from("subscriptions")
        .update(patch)
        .eq("id", sub.id);
      return;
    }

    case "subscription.canceled": {
      await db
        .from("subscriptions")
        .update({
          status: "canceled",
          cancellation_reason: data?.cancellation_reason ?? null,
          next_charge_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      return;
    }

    case "subscription.updated": {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data?.subscription?.status) patch.status = mapFlouciStatus(data.subscription.status);
      if (period.start) patch.current_period_start = period.start;
      if (period.end) patch.current_period_end = period.end;
      if (nextChargeAt !== undefined) patch.next_charge_at = nextChargeAt;
      if (data?.subscription?.cancel_at_period_end != null) {
        patch.cancel_at_period_end = Boolean(data.subscription.cancel_at_period_end);
      }
      await db.from("subscriptions").update(patch).eq("id", sub.id);
      return;
    }

    default:
      console.log("[api/flouci/webhook] unhandled event:", eventType);
  }
}

// Keep tndToMillimes imported for parity with the checkout route (documented
// conversion); the webhook uses millimes directly from Flouci payloads.
void tndToMillimes;
