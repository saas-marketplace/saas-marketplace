import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  callbackUrls,
  createSubscription,
  generatePayment,
  newDeveloperTrackingId,
  tndToMillimes,
} from "@/lib/flouci";

export const dynamic = "force-dynamic";

const RECURRING_ACCESS_ERRORS = new Set([
  "recurring_payments_disabled",
  "merchant_not_allowed",
  "merchant_wallet_inactive",
  "affiliation_inactive",
  "card_recurring_not_enabled",
  "card_recurring_not_implemented",
]);

/**
 * POST /api/flouci/checkout
 * Body: { planId } to start a Flouci recurring subscription,
 *       { productId } to start a one-off Flouci payment.
 *
 * The browser sends ONLY an id. The price, name, interval and description are
 * always read from the database server-side, and the amount is converted to
 * millimes here — never trusted from the client.
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Please sign in to subscribe." }, { status: 401 });
  }

  let body: { planId?: string; productId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const links = callbackUrls();

  // ── Recurring subscription from a plan ────────────────────────────────────
  if (body.planId) {
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", body.planId)
      .eq("active", true)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ error: "This plan is not available." }, { status: 404 });
    }

    const amountMillimes = tndToMillimes(Number(plan.price_tnd));
    if (!Number.isFinite(amountMillimes) || amountMillimes < 100) {
      return NextResponse.json({ error: "Plan price is invalid." }, { status: 500 });
    }

    // Flouci settles charges in TND (millimes). Non-TND plans cannot be charged
    // through Flouci recurring subscriptions yet — fail clearly instead of
    // silently mis-charging the customer.
    const currency = String(plan.currency ?? "TND").toUpperCase();
    if (currency !== "TND") {
      return NextResponse.json(
        {
          error: `This plan is priced in ${currency}. Flouci currently settles recurring subscriptions in TND — please create a TND version of this plan.`,
        },
        { status: 400 },
      );
    }

    const trackingId = newDeveloperTrackingId(user.id);

    const result = await createSubscription({
      amount: amountMillimes,
      interval: plan.interval as "day" | "week" | "month" | "year",
      intervalCount: Number(plan.interval_count) || 1,
      name: String(plan.name).slice(0, 50),
      description: (plan.description ?? `${plan.name} subscription`).slice(0, 200),
      developerTrackingId: trackingId,
      clientId: user.id,
      successLink: links.success,
      failLink: links.fail,
      webhook: links.webhook,
      maxCycles: plan.max_cycles ?? undefined,
    });

    // Flouci: repeating an existing developer_tracking_id returns 409 with the
    // existing subscription ids — treat it as success and reuse the link.
    const duplicate =
      result.status === 409 && result.data?.result?.error === "duplicate_developer_tracking_id";

    if (result.data?.result?.success !== true && !duplicate) {
      const flouciError: string =
        result.data?.result?.error ||
        (Array.isArray(result.data) ? result.data.join("; ") : null) ||
        `Flouci request failed (HTTP ${result.status})`;

      if (RECURRING_ACCESS_ERRORS.has(flouciError)) {
        return NextResponse.json(
          {
            error: `Recurring payments are not enabled for this Flouci merchant account yet (Flouci reported: ${flouciError}). Please enable recurring payments with Flouci before going live.`,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: flouciError }, { status: 502 });
    }

    const r = result.data?.result ?? {};
    const subscriptionId: string | undefined = r.subscription_id;
    const paymentId: string | undefined = r.payment_id;
    const link: string | undefined = r.link;

    if (!subscriptionId || !link) {
      return NextResponse.json({ error: "Flouci returned an unexpected response." }, { status: 502 });
    }

    // Store the subscription (status incomplete until the first charge is paid).
    // The caller's session cannot write here — subscriptions has SELECT-only RLS
    // (migration 006). The user is authenticated above, so the service client is
    // used for this write and user_id still comes from the verified session.
    const { error: insertError } = await createServiceSupabaseClient()
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan_id: plan.id,
          flouci_subscription_id: subscriptionId,
          developer_tracking_id: trackingId,
          flouci_client_id: user.id,
          status: "incomplete",
          price_tnd: plan.price_tnd,
          amount_millimes: amountMillimes,
          currency,
          interval: plan.interval,
          interval_count: Number(plan.interval_count) || 1,
          max_cycles: plan.max_cycles ?? null,
          checkout_url: link,
          latest_payment_id: paymentId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "developer_tracking_id" },
      );

    if (insertError) {
      console.error("[api/flouci/checkout] subscription insert error:", insertError);
      // The checkout link is still valid; the webhook can heal the row.
    }

    return NextResponse.json({ link, subscription_id: subscriptionId, payment_id: paymentId });
  }

  // ── One-off payment from a product ────────────────────────────────────────
  if (body.productId) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, title, price, sale_price, is_active")
      .eq("id", body.productId)
      .maybeSingle();

    if (productError || !product || product.is_active === false) {
      return NextResponse.json({ error: "This product is not available." }, { status: 404 });
    }

    const priceTnd = Number(product.sale_price ?? product.price);
    const amountMillimes = tndToMillimes(priceTnd);
    if (!Number.isFinite(amountMillimes) || amountMillimes < 100) {
      return NextResponse.json({ error: "Product price is invalid." }, { status: 500 });
    }

    const trackingId = `payment_${user.id}_${newDeveloperTrackingId(user.id).split("_")[2]}`;

    const result = await generatePayment({
      amount: amountMillimes,
      developerTrackingId: trackingId,
      successLink: links.success,
      failLink: links.fail,
      webhook: links.webhook,
    });

    if (result.data?.result?.success !== true || !result.data?.result?.link) {
      return NextResponse.json(
        {
          error:
            result.data?.result?.message ||
            `Flouci request failed (HTTP ${result.status})`,
        },
        { status: 502 },
      );
    }

    // Record the pending order so the webhook can mark it paid. Same reason as
    // the subscription write above: the caller's session cannot insert here.
    await createServiceSupabaseClient().from("orders").insert([
      {
        user_id: user.id,
        payment_provider: "flouci",
        payment_reference: result.data.result.payment_id ?? trackingId,
        status: "pending",
        total_amount: priceTnd,
        currency: "TND",
        items: [{ product_id: product.id, title: product.title, amount_millimes: amountMillimes }],
        customer_email: user.email ?? null,
      },
    ]);

    return NextResponse.json({
      link: result.data.result.link,
      payment_id: result.data.result.payment_id,
    });
  }

  return NextResponse.json({ error: "planId or productId is required." }, { status: 400 });
}
