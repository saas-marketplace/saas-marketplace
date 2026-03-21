-- ============================================
-- Create avatars storage bucket for team members
-- ============================================

-- Insert bucket if not exists (will fail silently if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage Policies for team-avatars bucket
-- ============================================

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "allow_authenticated_upload_team_avatars" ON storage.objects;
CREATE POLICY "allow_authenticated_upload_team_avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-avatars'
);

-- Allow public read access to avatars
DROP POLICY IF EXISTS "allow_public_read_team_avatars" ON storage.objects;
CREATE POLICY "allow_public_read_team_avatars"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'team-avatars'
);

-- Allow authenticated users to update avatars
DROP POLICY IF EXISTS "allow_authenticated_update_team_avatars" ON storage.objects;
CREATE POLICY "allow_authenticated_update_team_avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-avatars'
);

-- Allow authenticated users to delete avatars
DROP POLICY IF EXISTS "allow_authenticated_delete_team_avatars" ON storage.objects;
CREATE POLICY "allow_authenticated_delete_team_avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-avatars'
);
