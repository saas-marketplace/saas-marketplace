import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@supabase/supabase-js';

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ProductFormValues) => {
    const { error } = await supabase.from('products').insert([data]);
    if (!error) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Title</label>
        <input {...register('title')} className="input" />
        {errors.title && <p className="text-red-500">{errors.title.message}</p>}
      </div>
      <div>
        <label>Description</label>
        <textarea {...register('description')} className="input" />
        {errors.description && <p className="text-red-500">{errors.description.message}</p>}
      </div>
      <div>
        <label>Price</label>
        <input type="number" {...register('price')} className="input" />
        {errors.price && <p className="text-red-500">{errors.price.message}</p>}
      </div>
      <div>
        <label>Type</label>
        <select {...register('type')} className="input">
          <option value="ebook">Ebook</option>
          <option value="design">Design</option>
          <option value="template">Template</option>
        </select>
        {errors.type && <p className="text-red-500">{errors.type.message}</p>}
      </div>
      <div>
        <label>Preview Image URL</label>
        <input {...register('preview_image')} className="input" />
        {errors.preview_image && <p className="text-red-500">{errors.preview_image.message}</p>}
      </div>
      <div>
        <label>Download File URL</label>
        <input {...register('download_file')} className="input" />
        {errors.download_file && <p className="text-red-500">{errors.download_file.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary">Submit</button>
    </form>
  );
}