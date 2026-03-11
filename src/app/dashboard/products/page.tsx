"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Package,
  DollarSign,
  Image as ImageIcon,
  File,
  ShoppingCart,
  Tag
} from 'lucide-react';

interface Product {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  price: number;
  sale_price: number | null;
  category: string;
  image_url: string | null;
  file_url: string | null;
  file_size: string | null;
  file_format: string | null;
  tags: string[];
  features: string[];
  like_count: number;
  download_count: number;
  is_featured: boolean;
  is_active: boolean;
  author_name: string | null;
  author_avatar: string | null;
  created_at?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    sale_price: '',
    category: 'templates',
    tags: '',
    is_featured: false,
    is_active: true
  });
  
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newDownloadFile, setNewDownloadFile] = useState<File | null>(null);

  const supabase = createClient();

  useEffect(() => {
    checkUser();
    fetchProducts();
  });

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const parsedData = data.map((p: any) => ({
        ...p,
        tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || [])
      }));
      setProducts(parsedData);
    }
    setLoading(false);
  }, [supabase]);

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function resetForm() {
    setFormData({
      title: '',
      slug: '',
      description: '',
      price: '',
      sale_price: '',
      category: 'templates',
      tags: '',
      is_featured: false,
      is_active: true
    });
    setImageUrl('');
    setFileUrl('');
    setNewImageFile(null);
    setNewDownloadFile(null);
    setEditingProduct(null);
  }

  function openAddDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      slug: product.slug,
      description: product.description || '',
      price: product.price.toString(),
      sale_price: product.sale_price?.toString() || '',
      category: product.category || 'templates',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      is_featured: product.is_featured || false,
      is_active: product.is_active || false
    });
    setImageUrl(product.image_url || '');
    setFileUrl(product.file_url || '');
    setNewImageFile(null);
    setNewDownloadFile(null);
    setIsDialogOpen(true);
  }

  async function handleImageUpload(file: File): Promise<string> {
    const fileName = `products/${Date.now()}-${file.name}`;
    
    try {
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, file);
      
      if (error) {
        console.warn('Image upload failed, using placeholder:', error.message);
        return '';
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (err) {
      console.warn('Image upload error:', err);
      return '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setUploading(false);

    try {
      if (!user) {
        alert('Please log in to add products');
        setSaving(false);
        return;
      }

      let finalImageUrl = imageUrl;
      let finalFileUrl = fileUrl;

      // Upload new image if selected
      if (newImageFile) {
        setUploading(true);
        const uploadedUrl = await handleImageUpload(newImageFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
        // If upload failed, keep existing imageUrl or set to null
      }

      // Upload new file if selected
      if (newDownloadFile) {
        setUploading(true);
        const uploadedUrl = await handleImageUpload(newDownloadFile);
        if (uploadedUrl) {
          finalFileUrl = uploadedUrl;
        }
        // If upload failed, keep existing fileUrl or set to null
      }

      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      const productData = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        description: formData.description || null,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        category: formData.category,
        tags: tagsArray,
        image_url: finalImageUrl || null,
        file_url: finalFileUrl || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
        like_count: 0,
        download_count: 0
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
      }

      await fetchProducts();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products Management</h1>
          <p className="text-muted-foreground">Manage your marketplace products</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gradient-bg">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    placeholder="Product title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    placeholder="product-slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Product description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sale Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="templates">Templates</option>
                    <option value="ebooks">E-Books</option>
                    <option value="design">Design Assets</option>
                    <option value="assets">Assets</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags (comma separated)</label>
                  <Input
                    placeholder="react, dashboard, admin"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_featured" className="text-sm font-medium">
                    Featured
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Active
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Image</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewImageFile(file);
                        setImageUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                  {imageUrl && (
                    <div className="relative w-16 h-16 rounded overflow-hidden border">
                      <Image 
                        src={imageUrl} 
                        alt="Preview" 
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Download File (PDF, ZIP)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".zip,.pdf,.rar"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewDownloadFile(file);
                        setFileUrl(file.name);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <File className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                  {fileUrl && (
                    <span className="text-sm text-muted-foreground">{fileUrl}</span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="gradient-bg">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {uploading ? 'Uploading...' : (editingProduct ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : products.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-left py-3 px-4 font-medium">Price</th>
                <th className="text-left py-3 px-4 font-medium">Category</th>
                <th className="text-left py-3 px-4 font-medium">Featured</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {product.sale_price ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{formatPrice(product.sale_price)}</span>
                          <span className="text-sm text-muted-foreground line-through text-xs">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      ) : (
                        <span>{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">
                      <Tag className="w-3 h-3 mr-1" />
                      {product.category}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {product.is_featured ? (
                      <Badge className="bg-yellow-500">Featured</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No products available yet.</p>
          <p className="text-sm">Click "Add Product" to create your first product.</p>
        </div>
      )}
    </div>
  );
}
