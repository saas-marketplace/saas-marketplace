/**
 * flouci.ts — server-side Flouci Payment API client.
 *
 * Source of truth: https://docs.flouci.com/
 *  - Auth:            Authorization: Bearer <PUBLIC_KEY>:<PRIVATE_KEY>
 *                     (docs.flouci.com/getting-started/requests)
 *  - Create payment:  POST /api/v2/generate_payment
 *                     (docs.flouci.com/api-reference/generate-transaction)
 *  - Verify payment:  GET  /api/v2/verify_payment/{payment_id}
 *                     (docs.flouci.com/api-reference/verify-transaction)
 *  - Subscriptions:   /api/v2/subscriptions… recurring payments API
 *                     (docs.flouci.com/api-reference/recurring-payments/*)
 *
 * IMPORTANT: this module must only be imported from server code. The private
 * key lives exclusively in the server environment.
 */

import { createHmac, timingSafeEqual, randomBytes } from "crypto";

export const FLOUCI_API_BASE = "https://developers.flouci.com/api/v2";

export function getFlouciCredentials() {
  const publicKey = process.env.FLOUCI_PUBLIC_KEY;
  const privateKey = process.env.FLOUCI_PRIVATE_KEY;
  const configured = Boolean(publicKey && privateKey);
  return { publicKey, privateKey, configured };
}

function authHeader(): string {
  const { publicKey, privateKey, configured } = getFlouciCredentials();
  if (!configured) {
    throw new Error("Flouci credentials are not configured (FLOUCI_PUBLIC_KEY / FLOUCI_PRIVATE_KEY)");
  }
  return `Bearer ${publicKey}:${privateKey}`;
}

async function flouciFetch(
  path: string,
  init: RequestInit & { body?: string },
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${FLOUCI_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// ─── Generate payment (one-off purchases) ────────────────────────────────────
export interface GeneratePaymentParams {
  /** Amount in millimes (1 TND = 1000 millimes). */
  amount: number;
  developerTrackingId: string;
  successLink: string;
  failLink: string;
  webhook: string;
  acceptCard?: boolean;
}

export async function generatePayment(params: GeneratePaymentParams) {
  return flouciFetch("/generate_payment", {
    method: "POST",
    body: JSON.stringify({
      amount: String(Math.round(params.amount)),
      developer_tracking_id: params.developerTrackingId,
      accept_card: params.acceptCard ?? true,
      success_link: params.successLink,
      fail_link: params.failLink,
      webhook: params.webhook,
    }),
  });
}

// ─── Verify payment ──────────────────────────────────────────────────────────
export interface VerifiedPayment {
  success: boolean;
  status?: string;
  type?: string;
  amount?: number;
  developerTrackingId?: string | null;
  subscriptionId?: string | null;
  billingReason?: string | null;
  settlementStatus?: string | null;
}

/** Only `success === true` and `status === "SUCCESS"` is a paid transaction. */
export async function verifyPayment(paymentId: string): Promise<VerifiedPayment> {
  const { ok, data } = await flouciFetch(`/verify_payment/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });

  // "In this endpoint, it is crucial to ensure that the 'success' field is
  // true before attempting to parse the API's content." — docs
  if (!ok || !data || data.success !== true || !data.result) {
    return { success: false };
  }

  const r = data.result;
  return {
    success: r.status === "SUCCESS",
    status: r.status,
    type: r.type,
    amount: r.amount,
    developerTrackingId: r.developer_tracking_id ?? null,
    subscriptionId: r.subscription_id ?? null,
    billingReason: r.billing_reason ?? null,
    settlementStatus: r.settlement_status ?? null,
  };
}

// ─── Recurring subscriptions ─────────────────────────────────────────────────
export interface CreateSubscriptionParams {
  /** Amount in millimes. */
  amount: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  name: string;
  description: string;
  developerTrackingId: string;
  clientId: string;
  successLink: string;
  failLink: string;
  webhook: string;
  maxCycles?: number;
}

/**
 * POST /api/v2/subscriptions
 * Repeating an existing developer_tracking_id returns HTTP 409 with the
 * existing subscription — callers must reuse it instead of retrying.
 */
export async function createSubscription(params: CreateSubscriptionParams) {
  const body: Record<string, unknown> = {
    amount: Math.round(params.amount),
    interval: params.interval,
    interval_count: params.intervalCount,
    name: params.name,
    description: params.description,
    developer_tracking_id: params.developerTrackingId,
    client_id: params.clientId,
    success_link: params.successLink,
    fail_link: params.failLink,
    webhook: params.webhook,
  };
  if (params.maxCycles != null) body.max_cycles = params.maxCycles;

  return flouciFetch("/subscriptions", { method: "POST", body: JSON.stringify(body) });
}

export async function getSubscription(subscriptionId: string) {
  return flouciFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "GET" });
}

/**
 * POST /api/v2/subscriptions/{id}/cancel
 * `at_period_end: false` (default) cancels immediately.
 */
export async function cancelSubscription(subscriptionId: string, atPeriodEnd: boolean) {
  return flouciFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ at_period_end: atPeriodEnd }),
  });
}

// ─── Webhook signature verification ──────────────────────────────────────────
// Flouci signs subscription webhook events with HMAC-SHA256:
//   X-Flouci-Signature: t=<timestamp>,v1=<hex_signature>
// The signature is computed over "<timestamp>.<raw request body>" with the
// private token. See docs.flouci.com/api-reference/recurring-payments/webhooks.
export const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): { valid: boolean; reason?: string } {
  if (!signatureHeader) return { valid: false, reason: "Missing signature header" };

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return { valid: false, reason: "Malformed signature header" };

  const timestampNum = Number(timestamp);
  if (!Number.isFinite(timestampNum)) return { valid: false, reason: "Invalid timestamp" };

  const age = Math.abs(Date.now() / 1000 - timestampNum);
  if (age > WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: "Timestamp outside tolerance window" };
  }

  const { privateKey } = getFlouciCredentials();
  if (!privateKey) return { valid: false, reason: "Missing private key" };

  const expected = createHmac("sha256", privateKey)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** 1 TND = 1000 millimes — always convert server-side from the DB price. */
export function tndToMillimes(priceTnd: number): number {
  return Math.round(priceTnd * 1000);
}

/** Unique internal reference: subscription_<userId>_<random>. */
export function newDeveloperTrackingId(userId: string): string {
  return `subscription_${userId}_${randomBytes(12).toString("hex")}`;
}

/** Absolute HTTPS URL for callbacks, derived from the actual deployment. */
export function siteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.URL && process.env.URL.startsWith("http") ? process.env.URL : undefined) ||
    (process.env.DEPLOY_PRIME_URL && process.env.DEPLOY_PRIME_URL.startsWith("http")
      ? process.env.DEPLOY_PRIME_URL
      : undefined);
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function callbackUrls() {
  const base = siteUrl();
  return {
    success: `${base}/subscription/success`,
    fail: `${base}/subscription/fail`,
    webhook: `${base}/api/flouci/webhook`,
  };
}
