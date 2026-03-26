-- SQL commands to set up RLS policies for the audit_logs table
-- Run these commands in your Supabase SQL Editor

-- First, enable RLS on the audit_logs table if not already enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert" ON public.audit_logs;

-- Policy 1: Allow authenticated users to insert audit logs
-- This allows any authenticated user to insert audit logs
CREATE POLICY "Enable insert for authenticated users only"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow users to insert audit logs where user_id matches their ID
-- This provides an additional layer of security
CREATE POLICY "Enable insert for users based on user_id"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to read audit logs
-- This allows any authenticated user to read audit logs
CREATE POLICY "Enable read access for authenticated users"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy 4: Allow super_admins to read all audit logs
-- This provides admin-level access to audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Alternative: If you want to use service role key to bypass RLS completely,
-- make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables.
-- The service role key bypasses all RLS policies.

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_logs';
