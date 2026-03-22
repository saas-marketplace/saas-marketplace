-- 🔥 ENABLE USER SIGNUPS
-- Run this in Supabase SQL Editor to enable registrations

-- Update the allow_registrations setting to true
UPDATE public.system_settings
SET value = '"true"',
    updated_at = NOW()
WHERE key = 'allow_registrations';

-- Verify the change
SELECT key, value, updated_at
FROM public.system_settings
WHERE key = 'allow_registrations';
