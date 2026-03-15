-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Request Messages table (chat messages for requests)
CREATE TABLE public.request_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES public.user_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'freelancer')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on request_messages
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for request_messages

-- Users can see messages from their own requests
CREATE POLICY "Users view own request messages" ON public.request_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_requests 
    WHERE id = request_id AND user_id = auth.uid()
  )
);

-- Users can insert messages to their own requests
CREATE POLICY "Users create request messages" ON public.request_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_requests 
    WHERE id = request_id AND user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Admin can see all messages
CREATE POLICY "Admin view all request messages" ON public.request_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admin can respond to any request
CREATE POLICY "Admin create request messages" ON public.request_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Freelancers can see messages from requests sent to them
CREATE POLICY "Freelancers view their request messages" ON public.request_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_requests ur
    JOIN public.freelancers f ON f.id = ur.freelancer_id
    WHERE ur.id = request_id AND f.user_id = auth.uid()
  )
);

-- Freelancers can respond to requests sent to them
CREATE POLICY "Freelancers create request messages" ON public.request_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_requests ur
    JOIN public.freelancers f ON f.id = ur.freelancer_id
    WHERE ur.id = request_id AND f.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Update user_requests table to add recipient_id column
ALTER TABLE public.user_requests ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id);

-- Update RLS policies for user_requests to include recipient_id
-- Drop existing policies first
DROP POLICY IF EXISTS "Users view own requests" ON public.user_requests;
DROP POLICY IF EXISTS "Users create requests" ON public.user_requests;
DROP POLICY IF EXISTS "Users update own requests" ON public.user_requests;
DROP POLICY IF EXISTS "Admin view all requests" ON public.user_requests;

-- Create new policies for user_requests
CREATE POLICY "Users view own requests" ON public.user_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create requests" ON public.user_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own requests" ON public.user_requests FOR UPDATE USING (auth.uid() = user_id);

-- Admin sees all requests
CREATE POLICY "Admin view all requests" ON public.user_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Admin can update any request
CREATE POLICY "Admin update all requests" ON public.user_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Freelancers see requests sent to them
CREATE POLICY "Freelancers view their requests" ON public.user_requests FOR SELECT USING (
  freelancer_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.freelancers 
    WHERE id = freelancer_id AND user_id = auth.uid()
  )
);

-- Freelancers can update their requests
CREATE POLICY "Freelancers update their requests" ON public.user_requests FOR UPDATE USING (
  freelancer_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.freelancers 
    WHERE id = freelancer_id AND user_id = auth.uid()
  )
);
