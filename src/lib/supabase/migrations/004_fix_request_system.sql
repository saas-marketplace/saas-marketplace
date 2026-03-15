-- Milit Company Request System - Complete Fix
-- Migration 004: Create proper requests and request_messages tables with RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DROP OLD TABLES IF THEY EXIST
-- =============================================

-- Drop the obsolete client_requests table if it exists (causes PGRST205)
DROP TABLE IF EXISTS public.client_requests CASCADE;

-- Drop the existing user_requests table (we'll create a new requests table)
DROP TABLE IF EXISTS public.user_requests CASCADE;

-- Drop the existing request_messages table (we'll recreate it with proper schema)
DROP TABLE IF EXISTS public.request_messages CASCADE;

-- =============================================
-- CREATE NEW REQUESTS TABLE
-- =============================================

CREATE TABLE public.requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'answered')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on requests
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE NEW REQUEST_MESSAGES TABLE
-- =============================================

CREATE TABLE public.request_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on request_messages
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR REQUESTS
-- =============================================

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON public.requests
FOR SELECT USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "Users can create requests" ON public.requests
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own requests
CREATE POLICY "Users can update own requests" ON public.requests
FOR UPDATE USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all requests" ON public.requests
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Admins can update all requests
CREATE POLICY "Admins can update all requests" ON public.requests
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- RLS POLICIES FOR REQUEST_MESSAGES
-- =============================================

-- Users can view messages from their own requests
CREATE POLICY "Users can view own request messages" ON public.request_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE id = request_id AND user_id = auth.uid()
  )
);

-- Users can create messages for their own requests
CREATE POLICY "Users can create own request messages" ON public.request_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE id = request_id AND user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Admins can view all messages
CREATE POLICY "Admins can view all request messages" ON public.request_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can create messages for any request
CREATE POLICY "Admins can create request messages" ON public.request_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================
-- GRANTS (RLS policies handle access, but we need basic grants)
-- =============================================

GRANT ALL ON public.requests TO authenticated;
GRANT ALL ON public.request_messages TO authenticated;
