import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required'),
});

export default function ClientRequestForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const supabase = createClient();
    const { error } = await supabase.from('client_requests').insert([data]);
    if (error) {
      console.error('Error saving client request:', error);
    } else {
      alert('Request submitted successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} className="input" />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" {...register('email')} className="input" />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" {...register('message')} className="textarea" />
        {errors.message && <p className="text-red-500">{errors.message.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary">Submit</button>
    </form>
  );
}