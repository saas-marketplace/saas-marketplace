import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/d17/payments
 *
 * Creates a MANUAL D17 payment submission.
 *
 * SECURITY:
 *  - The user must be authenticated.
 *  - The browser sends only { productId, d17SenderNumber, customerEmail }.
 *  - The amount is ALWAYS read from the database product row — any price sent
 *    from the frontend is ignored.
 *  - The receiving D17 number is read from system_settings, never trusted
 *    from the client.
 *  - The submission is created with status "pending". No order is created
 *    and nothing is delivered until an admin confirms the payment.
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role configuration");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    // ── 1. Authentication is mandatory ──────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in or create an account before paying with D17." },
        { status: 401 }
      );
    }

    // ── 2. Validate the request body ────────────────────────────────────────
    let body: { productId?: string; d17SenderNumber?: string; customerEmail?: string; quantity?: string | number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const productId = typeof body.productId === "string" ? body.productId : "";
    const d17SenderNumber = typeof body.d17SenderNumber === "string" ? body.d17SenderNumber.trim() : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";

    // How many units are being paid for. Clamped to 1..99 and rounded down so a
    // tampered value can neither zero out nor inflate the amount.
    const quantity = Math.min(
      99,
      Math.max(1, Math.floor(Number(body.quantity ?? 1)) || 1),
    );

    if (!productId) {
      return NextResponse.json({ error: "Missing product." }, { status: 400 });
    }

    // Tunisian mobile numbers: 8 digits, optionally prefixed with +216 or 216.
    const digits = d17SenderNumber.replace(/[\s\-().]/g, "").replace(/^\+?216/, "");
    if (!/^(\d{8})$/.test(digits)) {
      return NextResponse.json(
        { error: "Please enter a valid D17 phone number (8 digits)." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // ── 3. Load the product from the database (never trust the frontend) ────
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, title, price, sale_price, is_active, product_type")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product || product.is_active === false) {
      return NextResponse.json({ error: "This product is not available." }, { status: 404 });
    }

    // Subscriptions are handled through Flouci — D17 applies to one-time products.
    if (product.product_type === "subscription") {
      return NextResponse.json(
        { error: "D17 payment is not available for subscriptions." },
        { status: 400 }
      );
    }

    const unitPrice = Number(product.sale_price ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ error: "Product price is invalid." }, { status: 400 });
    }

    // Quantity comes from the cart and is clamped above; the unit price is read
    // from the database, so the total is always trustworthy.
    const amount = Number((unitPrice * quantity).toFixed(3));

    // ── 4. Read the receiving D17 number from system_settings ───────────────
    const db = serviceClient();
    const { data: setting } = await db
      .from("system_settings")
      .select("value")
      .eq("key", "d17_receiving_number")
      .maybeSingle();

    let receivingNumber = "+216 28163762";
    if (setting?.value) {
      try {
        const parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
        if (typeof parsed === "string" && parsed.trim()) receivingNumber = parsed.trim();
      } catch {
        /* fall back to default */
      }
    }

    // ── 5. Create the pending submission (service role: RLS bypass) ─────────
    const { data: submission, error: insertError } = await db
      .from("d17_payments")
      .insert({
        user_id: user.id,
        product_id: product.id,
        product_name: product.title,
        amount,
        quantity,
        currency: "TND",
        d17_sender_number: digits,
        d17_receiving_number: receivingNumber,
        customer_email: customerEmail,
        status: "pending",
      })
      .select("id, product_name, amount, currency, status, created_at")
      .single();

    if (insertError || !submission) {
      console.error("[api/d17/payments] insert error:", insertError);
      return NextResponse.json({ error: "Failed to create the payment submission." }, { status: 500 });
    }

    // ── 6. Notify through the EXISTING notifications table ───────────────────
    // The approval notification is already posted by /api/admin/d17. This
    // acknowledgement closes the loop so the customer sees the submission in
    // the same bell — no D17-specific notification UI exists anywhere.
    try {
      await db.from("notifications").insert({
        user_id: user.id,
        type: "payment",
        title: "D17 payment submitted",
        message: `We received your D17 payment request for "${product.title}" (${quantity} × ${unitPrice} = ${amount} TND). It will be confirmed shortly.`,
        link: "/profile",
      });
    } catch (notifyError) {
      // Never fail the submission because the acknowledgement failed.
      console.error("[api/d17/payments] notification error:", notifyError);
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("[api/d17/payments] POST error:", error);
    return NextResponse.json({ error: "Failed to create the payment submission." }, { status: 500 });
  }
}
