-- Update user_requests status CHECK constraint to use new values
-- Old: pending, replied, closed
-- New: pending, received, answered

-- First, drop the existing CHECK constraint
ALTER TABLE public.user_requests DROP CONSTRAINT IF EXISTS user_requests_status_check;

-- Add new CHECK constraint with updated values
ALTER TABLE public.user_requests ADD CONSTRAINT user_requests_status_check 
CHECK (status IN ('pending', 'received', 'answered'));

-- Update any existing 'replied' status to 'received'
UPDATE public.user_requests SET status = 'received' WHERE status = 'replied';

-- Update any existing 'closed' status to 'answered'
UPDATE public.user_requests SET status = 'answered' WHERE status = 'closed';
