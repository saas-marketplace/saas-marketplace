import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required'),
  skills: z.string().min(1, 'Skills are required'),
  experience: z.string().min(1, 'Experience is required'),
  portfolio_link: z.string().url('Invalid URL'),
  status: z.enum(['active', 'inactive']),
});

type FreelancerFormValues = z.infer<typeof schema>;

export default function FreelancerForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FreelancerFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FreelancerFormValues) => {
    const { error } = await supabase.from('freelancers').insert([data]);
    if (!error) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Name</label>
        <input {...register('name')} className="input" />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      </div>
      <div>
        <label>Domain</label>
        <input {...register('domain')} className="input" />
        {errors.domain && <p className="text-red-500">{errors.domain.message}</p>}
      </div>
      <div>
        <label>Skills</label>
        <input {...register('skills')} className="input" />
        {errors.skills && <p className="text-red-500">{errors.skills.message}</p>}
      </div>
      <div>
        <label>Experience</label>
        <input {...register('experience')} className="input" />
        {errors.experience && <p className="text-red-500">{errors.experience.message}</p>}
      </div>
      <div>
        <label>Portfolio Link</label>
        <input {...register('portfolio_link')} className="input" />
        {errors.portfolio_link && <p className="text-red-500">{errors.portfolio_link.message}</p>}
      </div>
      <div>
        <label>Status</label>
        <select {...register('status')} className="input">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {errors.status && <p className="text-red-500">{errors.status.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary">Submit</button>
    </form>
  );
}