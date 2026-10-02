-- =============================================================================
-- 005 — remove Stripe
-- =============================================================================
-- Stripe has been removed from the application. Payments are processed through
-- the Flouci Payment API (see 006_flouci_subscriptions.sql), so the Stripe-only
-- order columns are no longer written or read anywhere.
--
-- The columns are dropped, not renamed, so no Stripe data is left behind and no
-- stale identifier can be mistaken for a current payment reference.
--
-- If you have historical orders and want to keep the raw values, comment out
-- the DROP statements below and run the two SELECTs first.
-- =============================================================================

-- Optional safety net: review the Stripe references you still hold.
-- SELECT id, stripe_session_id, stripe_payment_intent
-- FROM public.orders
-- WHERE stripe_session_id IS NOT NULL OR stripe_payment_intent IS NOT NULL;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS stripe_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent;

-- Keep orders.provider flexible: Flouci decides the provider per payment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_provider_check'
  ) THEN
    ALTER TABLE public.orders
      DROP CONSTRAINT orders_payment_provider_check;
  END IF;
END $$;
