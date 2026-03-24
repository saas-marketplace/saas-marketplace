-- Migration: Add response tracking columns to contact_submissions
-- Date: 2026-03-24
-- Description: Adds is_responded, responded_at, and response_content columns to track admin responses

-- Add new columns for response tracking
ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS is_responded boolean DEFAULT false;

ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone;

ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS response_content text;

-- Add index for faster queries on responded status
CREATE INDEX IF NOT EXISTS idx_contact_submissions_is_responded 
ON public.contact_submissions(is_responded);

-- Add index for faster queries on responded_at
CREATE INDEX IF NOT EXISTS idx_contact_submissions_responded_at 
ON public.contact_submissions(responded_at);
