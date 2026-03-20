-- Add needs_access_restored column to team_members table
-- This flag is set to TRUE when an admin reactivates a suspended team member
-- The middleware and /access-restored page will clear it to FALSE

ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS needs_access_restored boolean DEFAULT false;

-- Update any existing active team members to have needs_access_restored = false
UPDATE public.team_members 
SET needs_access_restored = false 
WHERE is_active = true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_needs_access_restored 
ON public.team_members(user_id, needs_access_restored) 
WHERE needs_access_restored = true;
