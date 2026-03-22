-- Optional migration to document freelancers.user_id (already nullable in prod)
-- Run only if needed for clarity in dashboard SQL editor

COMMENT ON COLUMN public.freelancers.user_id IS 'Optional FK to public.users(id): for freelancers with platform accounts. NULL for standalone/external freelancers.';
