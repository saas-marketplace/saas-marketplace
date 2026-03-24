/**
 * Products Service
 * Centralized database operations for products
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all products (server-side)
 */
export async function getProducts(options?: {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
  category?: string;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const { limit = 50, offset = 0, activeOnly = true, category } = options || {};

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[ProductsService] getProducts error:', error);
    throw error;
  }

  return { products: (data as Product[]) || [], total: count || 0 };
}

/**
 * Get product by ID (server-side)
 */
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[ProductsService] getProductById error:', error);
    throw error;
  }

  return data as Product | null;
}

/**
 * Get product by slug (server-side)
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[ProductsService] getProductBySlug error:', error);
    throw error;
  }

  return data as Product | null;
}

/**
 * Get product count (server-side)
 */
export async function getProductCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[ProductsService] getProductCount error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Create product (server-side)
 */
export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('[ProductsService] createProduct error:', error);
    throw error;
  }

  return data as Product;
}

/**
 * Update product (server-side)
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ProductsService] updateProduct error:', error);
    throw error;
  }

  return data as Product;
}

/**
 * Delete product (server-side)
 */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[ProductsService] deleteProduct error:', error);
    throw error;
  }
}

// ─── Client-side functions ───────────────────────────────────────────────

/**
 * Get all products (client-side)
 */
export async function getProductsClient(options?: {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = createBrowserClient();
  const { limit = 50, offset = 0, activeOnly = true } = options || {};

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[ProductsService] getProductsClient error:', error);
    throw error;
  }

  return { products: (data as Product[]) || [], total: count || 0 };
}
