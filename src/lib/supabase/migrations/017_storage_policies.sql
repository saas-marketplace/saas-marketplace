-- Supabase Storage Policies
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create products bucket (if not exists)
-- ============================================
-- Note: You need to create this manually in Supabase Dashboard:
-- Storage → New Bucket → Name: products → Public: ON

-- ============================================
-- STEP 2: Create blogs bucket (if not exists)
-- ============================================
-- Note: You need to create this manually in Supabase Dashboard:
-- Storage → New Bucket → Name: blogs → Public: ON

-- ============================================
-- STEP 3: Storage Policies for products bucket
-- ============================================

-- Allow authenticated users to upload to products
CREATE POLICY "allow_authenticated_upload_products"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
);

-- Allow everyone to read products images
CREATE POLICY "allow_public_read_products"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'products'
);

-- Allow authenticated users to update products images
CREATE POLICY "allow_authenticated_update_products"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products'
);

-- Allow authenticated users to delete products images
CREATE POLICY "allow_authenticated_delete_products"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
);

-- ============================================
-- STEP 4: Storage Policies for blogs bucket
-- ============================================

-- Allow authenticated users to upload to blogs
CREATE POLICY "allow_authenticated_upload_blogs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blogs'
);

-- Allow everyone to read blogs images
CREATE POLICY "allow_public_read_blogs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'blogs'
);

-- Allow authenticated users to update blogs images
CREATE POLICY "allow_authenticated_update_blogs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blogs'
);

-- Allow authenticated users to delete blogs images
CREATE POLICY "allow_authenticated_delete_blogs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blogs'
);
