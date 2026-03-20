-- Add status field to users table
-- Status is separate from role - handles user access state
-- Default is "active"

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;

-- Add check constraint for valid status values
ALTER TABLE public.users 
ADD CONSTRAINT users_status_check 
CHECK (status = 'active' OR status = 'suspended' OR status = 'removed' OR status = 'restored');

-- Update existing users to have status = 'active'
UPDATE public.users SET status = 'active' WHERE status IS NULL;
