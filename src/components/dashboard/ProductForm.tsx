import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['ebook', 'design', 'template']),
  preview_image: z.string().url('Invalid URL'),
  download_file: z.string().url('Invalid URL'),
});

type ProductFormValues = z.infer<typeof schema>;

export default function ProductForm({ onSuccess }: { onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ProductFormValues) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert([data]);
      if (!error) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving product:', error);
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
        <label className="text-sm font-medium text-slate-200">Preview Image URL</label>
        <Input {...register('preview_image')} placeholder="https://..." />
        {errors.preview_image && <p className="text-red-400 text-sm mt-1">{errors.preview_image.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-200">Download File URL</label>
        <Input {...register('download_file')} placeholder="https://..." />
        {errors.download_file && <p className="text-red-400 text-sm mt-1">{errors.download_file.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {saving ? 'Saving...' : 'Add Product'}
      </Button>
    </form>
  );
}
