-- =============================================================================
-- 007 — subscription_plans write policies + TND-only pricing
-- =============================================================================
-- Fixes: "new row violates row-level security policy for table subscription_plans"
-- when an admin adds a plan from /dashboard/plans.
--
-- WHY: migration 006 enables RLS on subscription_plans and adds only a SELECT
-- policy ("Public read active plans"). A SELECT-only policy rejects every write,
-- so POST /api/admin/plans -> INSERT fails with a 500.
--
-- 007 has never been applied to the dev/prod database — verified 2026-09-29 by
-- inserting currency='GBP', which 007's CHECK constraint would have rejected.
-- Apply this file in the Supabase SQL editor.
--
-- Pricing is TND-only: Flouci settles in TND (millimes), so a plan in another
-- currency could never be charged. See /api/flouci/checkout for the guard.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Role helper
--
-- The policies below need "is the caller a super admin?". Reading public.users
-- from inside another table's policy re-enters RLS on users, which makes the
-- check depend on users' own policies and can recurse. A SECURITY DEFINER
-- function evaluates the lookup with the owner's rights instead, so the answer
-- is always correct and the policy stays cheap.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS policies for subscription_plans
-- ─────────────────────────────────────────────────────────────────────────────
-- Anyone may read the catalogue; the Plans page is public. The server route
-- still filters to active plans, but the table read must not be blocked.
DROP POLICY IF EXISTS "Public read active plans" ON public.subscription_plans;
CREATE POLICY "Public read active plans"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- Super admins manage the plan catalogue.
DROP POLICY IF EXISTS "Super admins manage plans" ON public.subscription_plans;
CREATE POLICY "Super admins manage plans"
  ON public.subscription_plans FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins update plans" ON public.subscription_plans;
CREATE POLICY "Super admins update plans"
  ON public.subscription_plans FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins delete plans" ON public.subscription_plans;
CREATE POLICY "Super admins delete plans"
  ON public.subscription_plans FOR DELETE
  USING (public.is_super_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TND-only pricing
--
-- Normalise first: a plan stored in USD/EUR from before this constraint existed
-- would make the ADD CONSTRAINT below fail and abort the whole transaction.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.subscription_plans
SET currency = 'TND'
WHERE currency IS DISTINCT FROM 'TND';

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_currency_check;
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_currency_check
  CHECK (currency = 'TND');
