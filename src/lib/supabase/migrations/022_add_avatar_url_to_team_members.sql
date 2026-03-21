-- Add avatar_url column to team_members table
-- This allows Super Admin to upload custom avatars for team members

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create index for faster avatar lookups
CREATE INDEX IF NOT EXISTS idx_team_members_avatar_url
ON public.team_members(avatar_url)
WHERE avatar_url IS NOT NULL;
