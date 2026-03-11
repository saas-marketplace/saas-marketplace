import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    console.warn("Stripe webhook disabled because environment variables are missing.");

    return NextResponse.json(
      { message: "Stripe webhook temporarily disabled" },
      { status: 200 }
    );
  }

  const stripe = getStripe();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;

    await supabase.from("orders").insert({
      user_id: session.metadata?.user_id || null,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      status: "completed",
      total_amount: session.amount_total / 100,
      currency: session.currency,
      items: JSON.parse(session.metadata?.items || "[]"),
      customer_email: session.customer_email,
    });

    if (session.metadata?.user_id) {
      await supabase
        .from("cart")
        .delete()
        .eq("user_id", session.metadata.user_id);
    }
  }

  return NextResponse.json({ received: true });
}