-- =============================================================================
-- 010 — D17 submission quantity
--
-- A cart can hold 2+ units of one product, but d17_payments only stored the
-- unit price, so a 2 x 5 TND cart recorded (and displayed) 5 TND.
--
-- This adds the missing `quantity` column and backfills existing rows to 1.
-- The server multiplies the DATABASE price by this value, so the stored amount
-- always matches what the customer was told to send.
-- =============================================================================

ALTER TABLE public.d17_payments
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- Guard against zero/negative or absurd submissions at the storage layer too.
ALTER TABLE public.d17_payments
  DROP CONSTRAINT IF EXISTS d17_payments_quantity_positive;
ALTER TABLE public.d17_payments
  ADD CONSTRAINT d17_payments_quantity_positive CHECK (quantity >= 1 AND quantity <= 99);

-- Rows created before this migration were single-unit submissions.
UPDATE public.d17_payments
SET quantity = 1
WHERE quantity IS NULL OR quantity < 1;