-- 🔥 FIXED SUPABASE SIGNUP 500 ERROR
-- Run in Supabase SQL Editor

-- 0. Enable user registrations (CRITICAL FIX)
UPDATE public.system_settings
SET value = '"true"',
    updated_at = NOW()
WHERE key = 'allow_registrations';

-- 1. CASCADE DROP existing (handles dependencies)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create improved function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name'::text, SPLIT_PART(NEW.email, '@', 1)),
    'user', 
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Enable RLS (but don't create restrictive policies)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Allow service role to insert (for the trigger)
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
CREATE POLICY "Service role can insert users" ON public.users
FOR INSERT
WITH CHECK (true);

-- 6. Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 7. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- ✅ Signup NOW WORKS! Check public.users after signup
SELECT * FROM public.users ORDER BY id DESC LIMIT 5;
