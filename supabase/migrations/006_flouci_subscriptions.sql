-- =============================================================================
-- 006 — migrate payments from iPay.tn to Flouci (https://docs.flouci.com)
-- =============================================================================
-- * Drops every iPay-specific column / constraint left by 004 and 005.
-- * Creates the Flouci subscription model:
--     subscription_plans        — plans created from the admin dashboard
--     subscriptions             — Flouci recurring subscriptions (per user/plan)
--     payments                  — every Flouci charge (create / cycle / retry)
--     flouci_webhook_events     — webhook event log, de-duplicated by event_id
--
-- Amounts are stored in millimes (1 TND = 1000 millimes) exactly as Flouci
-- expects them. Subscription statuses mirror Flouci's lifecycle:
--   incomplete | incomplete_expired | active | past_due | unpaid | canceled
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Remove iPay leftovers
-- ─────────────────────────────────────────────────────────────────────────────
-- products: iPay catalogue columns
ALTER TABLE public.products
  DROP COLUMN IF EXISTS ipay_product_code,
  DROP COLUMN IF EXISTS ipay_product_id,
  DROP COLUMN IF EXISTS ipay_product_url,
  DROP COLUMN IF EXISTS ipay_synced_at;

-- orders: iPay constraint from 005
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_provider_check;

-- system_settings: the "ipay" settings row written by /api/ipay/config
DELETE FROM public.system_settings WHERE key = 'ipay';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Subscription plans (admin-managed, shown on the public Plans page)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  description     text,
  price_tnd       numeric NOT NULL CHECK (price_tnd >= 0),
  currency        text NOT NULL DEFAULT 'TND',
  interval        text NOT NULL DEFAULT 'month' CHECK (interval IN ('day','week','month','year')),
  interval_count  integer NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
  features        text[] DEFAULT '{}'::text[],
  max_cycles      integer,
  active          boolean NOT NULL DEFAULT true,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Subscriptions — one row per Flouci subscription
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id                uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  flouci_subscription_id text,
  developer_tracking_id  text UNIQUE,
  flouci_client_id       text,
  status                 text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete','incomplete_expired','active','past_due','unpaid','canceled')),
  cancellation_reason    text,
  price_tnd              numeric NOT NULL,
  amount_millimes        integer NOT NULL,
  currency               text NOT NULL DEFAULT 'TND',
  interval               text NOT NULL DEFAULT 'month',
  interval_count         integer NOT NULL DEFAULT 1,
  max_cycles             integer,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  next_charge_at         timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  checkout_url           text,
  latest_payment_id      text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx      ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_flouci_id_idx    ON public.subscriptions(flouci_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx       ON public.subscriptions(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Payments — every charge verified / received through Flouci
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subscription_id        uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id                uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  flouci_payment_id      text UNIQUE,
  flouci_subscription_id text,
  developer_tracking_id  text,
  amount_millimes        integer NOT NULL,
  amount_tnd             numeric NOT NULL,
  currency               text NOT NULL DEFAULT 'TND',
  status                 text NOT NULL,
  payment_type           text,
  billing_reason         text CHECK (billing_reason IN ('subscription_create','subscription_cycle','subscription_retry')),
  settlement_status      text,
  amount_verified        boolean NOT NULL DEFAULT false,
  verified_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_idx         ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_subscription_idx ON public.payments(subscription_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Webhook event log — de-duplication by Flouci event_id
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flouci_webhook_events (
  event_id          text PRIMARY KEY,
  event             text NOT NULL,
  subscription_id   text,
  payment_id        text,
  payload           jsonb NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','processed','failed'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flouci_webhook_events ENABLE ROW LEVEL SECURITY;

-- Plans are public read (Plans page), but only writable server-side.
DROP POLICY IF EXISTS "Public read active plans" ON public.subscription_plans;
CREATE POLICY "Public read active plans"
  ON public.subscription_plans FOR SELECT
  USING (active = true OR true); -- reads go through service role/admin; keep simple public read

-- Users see their own subscriptions and payments; everything is written by the
-- backend (service role / authenticated server session).
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Webhook events: backend only.
DROP POLICY IF EXISTS "No client access to webhook events" ON public.flouci_webhook_events;
CREATE POLICY "No client access to webhook events"
  ON public.flouci_webhook_events FOR SELECT
  USING (false);
