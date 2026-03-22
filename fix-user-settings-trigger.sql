-- 🔥 SAFE USER SETTINGS TRIGGER
-- Run in Supabase SQL Editor
-- This trigger safely creates user_settings without crashing signup

-- 1. Ensure user_settings table exists
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_settings jsonb DEFAULT '{
    "weekly_summary": false,
    "security_alerts": true,
    "dashboard_alerts": true,
    "new_message_alerts": true,
    "new_request_alerts": true,
    "blog_comment_alerts": true,
    "email_notifications": true,
    "product_update_alerts": true,
    "team_invitation_alerts": true
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create SAFE trigger function (never crash signup)
CREATE OR REPLACE FUNCTION public.create_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't crash signup
    RAISE WARNING 'Failed to create user_settings for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate trigger
DROP TRIGGER IF EXISTS trigger_create_user_settings ON auth.users;

CREATE TRIGGER trigger_create_user_settings
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_settings();

-- 4. Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 5. Allow users to read their own settings
DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings" ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- 6. Allow users to update their own settings
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- 7. Allow service role to insert (for the trigger)
DROP POLICY IF EXISTS "Service role can insert user_settings" ON public.user_settings;
CREATE POLICY "Service role can insert user_settings" ON public.user_settings
FOR INSERT
WITH CHECK (true);

-- ✅ Test: Check if user_settings table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_settings'
ORDER BY ordinal_position;
