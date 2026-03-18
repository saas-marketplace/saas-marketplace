-- SIMPLIFIED RLS policies that work properly
-- Run this in Supabase SQL Editor

-- First, disable all existing policies and RLS to start fresh
ALTER TABLE IF EXISTS public.freelancers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.request_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blogs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public read access" ON public.freelancers;
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
DROP POLICY IF EXISTS "Allow public read access" ON public.requests;
DROP POLICY IF EXISTS "Allow public read access" ON public.team_members;
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Allow public read access" ON public.request_messages;
DROP POLICY IF EXISTS "Allow public read access" ON public.domains;
DROP POLICY IF EXISTS "Allow public read access" ON public.blogs;
DROP POLICY IF EXISTS "Allow public read access" ON public.cart;

DROP POLICY IF EXISTS "super_admin_full_access_freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "super_admin_full_access_products" ON public.products;
DROP POLICY IF EXISTS "super_admin_full_access_requests" ON public.requests;
DROP POLICY IF EXISTS "super_admin_full_access_team_members" ON public.team_members;
DROP POLICY IF EXISTS "super_admin_full_access_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_full_access_request_messages" ON public.request_messages;
DROP POLICY IF EXISTS "super_admin_full_access_domains" ON public.domains;
DROP POLICY IF EXISTS "super_admin_full_access_blogs" ON public.blogs;

DROP POLICY IF EXISTS "authenticated_users_read_freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "authenticated_users_read_products" ON public.products;
DROP POLICY IF EXISTS "authenticated_users_read_requests" ON public.requests;
DROP POLICY IF EXISTS "authenticated_users_read_team_members" ON public.team_members;
DROP POLICY IF EXISTS "authenticated_users_read_users" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_read_request_messages" ON public.request_messages;
DROP POLICY IF EXISTS "authenticated_users_read_domains" ON public.domains;
DROP POLICY IF EXISTS "authenticated_users_read_blogs" ON public.blogs;

-- Re-enable RLS with simple policies that allow authenticated users full access
ALTER TABLE IF EXISTS public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart ENABLE ROW LEVEL SECURITY;

-- Simple policy: allow authenticated users to do everything
CREATE POLICY "authenticated_full_access" ON public.freelancers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.requests FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.team_members FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.request_messages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.domains FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.blogs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON public.cart FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
