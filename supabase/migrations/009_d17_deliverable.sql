-- D17 delivery file markers
ALTER TABLE public.d17_payments
  ADD COLUMN IF NOT EXISTS deliverable_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deliverable_file_name text;
