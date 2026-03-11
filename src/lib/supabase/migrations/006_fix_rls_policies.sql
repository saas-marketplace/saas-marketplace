-- Fix RLS policies - ONLY admin can insert, update, delete for all admin tables

-- Freelancers table - admin only
DROP POLICY IF EXISTS "Users can insert freelancers" ON freelancers;
DROP POLICY IF EXISTS "Users can update freelancers" ON freelancers;
DROP POLICY IF EXISTS "Users can delete freelancers" ON freelancers;

CREATE POLICY "Admin can insert freelancers" ON freelancers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can update freelancers" ON freelancers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can delete freelancers" ON freelancers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Products table - admin only
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

CREATE POLICY "Admin can insert products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can update products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can delete products" ON products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Domains table - admin only
DROP POLICY IF EXISTS "Users can insert domains" ON domains;
DROP POLICY IF EXISTS "Users can update domains" ON domains;
DROP POLICY IF EXISTS "Users can delete domains" ON domains;

CREATE POLICY "Admin can insert domains" ON domains
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can update domains" ON domains
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can delete domains" ON domains
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );
