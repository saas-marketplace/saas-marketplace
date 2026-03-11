-- Storage policies for products bucket (ONLY admin can upload/delete)

-- Create the products bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from products bucket (public access)
CREATE POLICY "Anyone can read products"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'products'
);

-- ONLY admin can upload to products bucket
CREATE POLICY "Admin can upload to products"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'products'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ONLY admin can update products
CREATE POLICY "Admin can update products"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'products'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ONLY admin can delete products
CREATE POLICY "Admin can delete products"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'products'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);
