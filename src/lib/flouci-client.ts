"use client";

/**
 * flouci-client.ts — thin browser helper for the Flouci checkout flow.
 *
 * It never touches Flouci directly: it posts only a planId or productId to our
 * own backend, which looks up the real price in the database, creates the
 * Flouci subscription / payment server-side and returns the hosted checkout
 * `link` issued by Flouci. The browser is then redirected to that link.
 */

export interface CheckoutResult {
  ok: boolean;
  paymentUrl?: string;
  error?: string;
}

type CheckoutInput = { planId: string } | { productId: string };

export async function startFlouciCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    const res = await fetch("/api/flouci/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.link) {
      return { ok: false, error: data?.error || "Could not start the payment." };
    }

    return { ok: true, paymentUrl: data.link };
  } catch {
    return { ok: false, error: "Could not reach the payment service." };
  }
}
