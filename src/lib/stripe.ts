import Stripe from "stripe";

// Lazy initialization to prevent build failures when env vars are missing
export const stripe: InstanceType<typeof Stripe> | Record<string, never> =
  process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-12-18.acacia" as any, // <-- fix for TS version type
        typescript: true,
      })
    : {};

// Helper to safely get the publishable key
export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}