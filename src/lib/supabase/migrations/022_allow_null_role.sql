-- Allow null values in users.role column to support removed team members
-- This allows setting role to null when a team member is removed

-- First, drop the existing check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new check constraint that allows null
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IS NULL OR role = 'user' OR role = 'admin' OR role = 'super_admin');
