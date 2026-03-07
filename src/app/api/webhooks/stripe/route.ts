import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    // Create order in Supabase
    await supabase.from("orders").insert({
      user_id: session.metadata.user_id || null,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      status: "completed",
      total_amount: session.amount_total / 100,
      currency: session.currency,
      items: JSON.parse(session.metadata.items || "[]"),
      customer_email: session.customer_email,
    });

    // Clear user's cart
    if (session.metadata.user_id) {
      await supabase
        .from("cart")
        .delete()
        .eq("user_id", session.metadata.user_id);
    }
  }

  return NextResponse.json({ received: true });
}