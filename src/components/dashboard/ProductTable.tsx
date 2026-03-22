"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/stores/permissions-context';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  preview_image: string;
  download_file: string;
};

export default function ProductTable() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { canUpdate, canDelete, isLoading: permsLoading } = usePermissions();

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts((data || []) as Product[]);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const canManageProducts = canUpdate('products') || canDelete('products');

  if (loading || permsLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /> Loading...</div>;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 font-medium">Title</th>
            <th className="text-left p-4 font-medium">Description</th>
            <th className="text-left p-4 font-medium">Price</th>
            <th className="text-left p-4 font-medium">Type</th>
            {canManageProducts && <th className="text-right p-4 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-muted/50">
              <td className="p-4">{product.title}</td>
              <td className="p-4 max-w-md truncate">{product.description}</td>
              <td className="p-4">${product.price}</td>
              <td className="p-4 capitalize">{product.type}</td>
              {canManageProducts && (
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdate('products') && (
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/products/manage?id=${product.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {canDelete('products') && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={canManageProducts ? 5 : 4} className="p-8 text-center text-muted-foreground">
                No products found. {canUpdate('products') && 'Add your first product to get started.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
