-- Add freelancer_data JSONB field to store complete freelancer information
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS freelancer_data jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_freelancer_data ON public.requests((freelancer_data->>'name'));

COMMENT ON COLUMN public.requests.freelancer_data IS 'Complete freelancer data stored as JSON: name, domain, skills, experience_level, rating, reviews_count, projects_count, description';
