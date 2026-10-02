-- ══════════════════════════
-- 008 — D17 manual payment submissions
--
-- A D17 submission is a MANUAL payment request. It starts as "pending".
-- It is NEVER "received" until an admin confirms the money actually arrived.
-- Only then is an order created and the product delivered.
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.d17_payments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES public.users(id),
  product_id          uuid NOT NULL REFERENCES public.products(id),
  product_name        text NOT NULL,
  amount              numeric NOT NULL,
  currency            text NOT NULL DEFAULT 'TND',
  d17_sender_number   text NOT NULL,
  d17_receiving_number text NOT NULL,
  customer_email      text NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'received', 'rejected')),
  rejection_reason    text,
  order_id            uuid,
  verified_at         timestamptz,
  verified_by         uuid REFERENCES public.users(id),
  delivered_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT d17_payments_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS d17_payments_user_id_idx  ON public.d17_payments(user_id);
CREATE INDEX IF NOT EXISTS d17_payments_status_idx   ON public.d17_payments(status);
CREATE INDEX IF NOT EXISTS d17_payments_created_idx  ON public.d17_payments(created_at DESC);

-- ── Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.d17_payments ENABLE ROW LEVEL SECURITY;

-- Users see only their own submissions.
CREATE POLICY d17_select_own
  ON public.d17_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users may create their own submissions (server-side route validates product,
-- price and receiving number — the browser cannot set amount or status).
CREATE POLICY d17_insert_own
  ON public.d17_payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Users can never update or delete their submissions.
-- Admins bypass RLS via the service-role key in the admin API routes.

-- ── Default receiving number (change it from Admin → D17 → Settings) ─────
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'd17_receiving_number',
  '"+216 28163762"',
  'D17 receiving number shown to customers on the manual payment form'
)
ON CONFLICT (key) DO NOTHING;
