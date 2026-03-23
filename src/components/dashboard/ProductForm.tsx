import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, X } from 'lucide-react';

const supabase = createClient();

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['ebook', 'design', 'template']),
  preview_image: z.string().optional(),
  download_file: z.string().optional(),
});

type ProductFormValues = z.infer<typeof schema>;

export default function ProductForm({ onSuccess }: { onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      
      console.log('Uploading image:', fileName);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;
      console.log('Uploaded image URL:', imageUrl);

      setPreviewImage(imageUrl);
      setPreviewFile(file);
      setValue('preview_image', imageUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewImage('');
    setPreviewFile(null);
    setValue('preview_image', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    setSaving(true);
    setError(null);
    try {
      console.log('Submitting product data:', data);
      
      const productData = {
        title: data.title,
        description: data.description,
        price: data.price,
        type: data.type,
        preview_image: previewImage || data.preview_image || null,
        download_file: data.download_file || null,
      };

      console.log('Product payload:', productData);
      
      const { data: result, error: insertError } = await supabase
        .from('products')
        .insert([productData])
        .select();
      
      console.log('Insert result:', result, 'Error:', insertError);
      
      if (insertError) {
        setError(insertError.message);
        console.error('Supabase error:', insertError);
      } else {
        // Create notifications for super admins about new product
        try {
          const { data: superAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'super_admin');
          
          if (superAdmins && superAdmins.length > 0) {
            const notifications = superAdmins.map((admin: { id: string }) => ({
              user_id: admin.id,
              type: 'product_update',
              title: 'New Product Added',
              message: `Product "${data.title}" has been added`,
              link: '/dashboard/products',
              is_read: false,
            }));
            
            await supabase.from('notifications').insert(notifications);
          }
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
        
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-200">Title</label>
        <Input {...register('title')} placeholder="Product title" />
        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-200">Description</label>
        <textarea 
          {...register('description')} 
          className="flex w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 transition-all duration-200 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 min-h-[100px]" 
          placeholder="Product description" 
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-200">Price</label>
        <Input type="number" {...register('price', { valueAsNumber: true })} placeholder="0.00" />
        {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-200">Type</label>
        <Select onValueChange={(value) => setValue('type', value as 'ebook' | 'design' | 'template')} defaultValue={watch('type')}>
          <SelectTrigger>
            <SelectValue placeholder="Select product type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ebook">Ebook</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="template">Template</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-200">Preview Image</label>
        {previewImage ? (
          <div className="relative mt-2">
            <Image 
              src={previewImage} 
              alt="Preview" 
              width={800}
              height={192}
              className="w-full h-48 object-cover rounded-md"
              loading="lazy"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="product-image-upload"
            />
            <label
              htmlFor="product-image-upload"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-md cursor-pointer hover:border-cyan-400 transition-colors"
            >
              <div className="text-center">
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-sm text-slate-400 mt-2">Click to upload image</p>
                  </>
                )}
              </div>
            </label>
          </div>
        )}
        {uploading && <p className="text-cyan-400 text-sm mt-2">Uploading...</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-200">Download File URL (optional)</label>
        <Input {...register('download_file')} placeholder="https://..." />
        {errors.download_file && <p className="text-red-400 text-sm mt-1">{errors.download_file.message}</p>}
      </div>
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-md">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={saving || uploading}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {saving ? 'Saving...' : 'Add Product'}
      </Button>
    </form>
  );
}
