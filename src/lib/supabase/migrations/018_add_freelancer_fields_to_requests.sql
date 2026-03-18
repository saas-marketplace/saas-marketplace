-- Add freelancer-related fields to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS freelancer_id uuid REFERENCES public.freelancers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS freelancer_domain text,
ADD COLUMN IF NOT EXISTS freelancer_characteristics jsonb,
ADD COLUMN IF NOT EXISTS subject_type text DEFAULT 'custom' CHECK (subject_type IN ('hire', 'info', 'project', 'custom'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_freelancer_id ON public.requests(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_requests_subject_type ON public.requests(subject_type);

-- Update RLS policies to allow reading freelancer data
-- (Existing policies should still work, but let's ensure proper access)

COMMENT ON COLUMN public.requests.freelancer_id IS 'The ID of the freelancer being requested';
COMMENT ON COLUMN public.requests.freelancer_domain IS 'The domain/expertise area of the freelancer';
COMMENT ON COLUMN public.requests.freelancer_characteristics IS 'Additional characteristics of the freelancer (skills, experience, etc.)';
COMMENT ON COLUMN public.requests.subject_type IS 'Type of request: hire, info, project, or custom';
