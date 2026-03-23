"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, Loader2 } from 'lucide-react';

const supabase = createClient();

const schema = z.object({
  display_name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  domain_id: z.string().optional(),
  skills: z.string().min(1, 'Skills are required'),
  experience_level: z.string().optional(),
  location: z.string().optional(),
  completed_projects: z.number().optional(),
  is_available: z.boolean().optional(),
  avatar_url: z.string().optional(),
});

type FreelancerFormValues = z.infer<typeof schema>;

interface Domain {
  id: string;
  name: string;
}

interface FreelancerFormProps {
  onSuccess: () => void;
  domains?: Domain[];
  initialData?: Partial<FreelancerFormValues> & { avatar_url?: string; experience_level?: string };
}

export default function FreelancerForm({ onSuccess, domains = [], initialData }: FreelancerFormProps) {
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FreelancerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ? {
      ...initialData,
      experience_level: initialData.experience_level || '',
    } : {
      is_available: true,
    },
  });

  const onSubmit = async (data: FreelancerFormValues) => {
    setSaving(true);
    setError(null);
    try {
      console.log('Submitting freelancer data:', data);
      
      const skillsArray = data.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const freelancerData = {
        display_name: data.display_name,
        title: data.title || null,
        skills: skillsArray,
        experience_level: data.experience_level || null,
        location: data.location || null,
        domain_id: data.domain_id || null,
        completed_projects: data.completed_projects || 0,
        is_available: data.is_available ?? true,
        avatar_url: avatarUrl || null,
      };

      console.log('Freelancer payload:', freelancerData);
      
      const { data: result, error: insertError } = await supabase.from('freelancers').insert([freelancerData]).select();
      
      console.log('Insert result:', result, 'Error:', insertError);
      
      if (insertError) {
        setError(insertError.message);
        console.error('Supabase error:', insertError);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving freelancer:', err);
      setError(err instanceof Error ? err.message : 'Failed to save freelancer');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `avatars/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('freelancers')
        .upload(fileName, file);

      if (error) {
        console.warn('Image upload failed:', error.message);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('freelancers')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.warn('Image upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Profile Image Upload */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-slate-600">
            <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
            {initialData?.display_name?.charAt(0).toUpperCase() || 'F'}
          </div>
        )}
        <div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Plus className="w-4 h-4" />
            Upload Photo
          </label>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-slate-200">Display Name *</label>
        <Input {...register('display_name')} placeholder="John Doe" />
        {errors.display_name && <p className="text-red-500 text-sm">{errors.display_name.message}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-medium text-slate-200">Title / Profession</label>
        <Input {...register('title')} placeholder="Full Stack Developer" />
      </div>

      {/* Domain */}
      <div>
        <label className="text-sm font-medium text-slate-200">Domain</label>
        <Select onValueChange={(value) => setValue('domain_id', value)} defaultValue={watch('domain_id')}>
          <SelectTrigger>
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.id}>
                {domain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skills */}
      <div>
        <label className="text-sm font-medium text-slate-200">Skills (comma separated) *</label>
        <Input {...register('skills')} placeholder="React, Node.js, TypeScript" />
        {errors.skills && <p className="text-red-500 text-sm">{errors.skills.message}</p>}
      </div>

      {/* Experience Level */}
      <div>
        <label className="text-sm font-medium text-slate-200">Experience Level</label>
        <Select onValueChange={(value) => setValue('experience_level', value)} defaultValue={watch('experience_level')}>
          <SelectTrigger>
            <SelectValue placeholder="Select experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="New Freelancer">New Freelancer</SelectItem>
            <SelectItem value="1+ years experience">1+ years experience</SelectItem>
            <SelectItem value="3+ years experience">3+ years experience</SelectItem>
            <SelectItem value="5+ years experience">5+ years experience</SelectItem>
            <SelectItem value="10+ years experience">10+ years experience</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location & Projects */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-200">Location</label>
          <Input {...register('location')} placeholder="New York, USA" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-200">Projects Completed</label>
          <Input
            type="number"
            {...register('completed_projects', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>
      </div>

      {/* Available Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_available"
          {...register('is_available')}
          className="w-4 h-4"
        />
        <label htmlFor="is_available" className="text-sm font-medium text-slate-200">
          Available for work
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {saving ? 'Saving...' : 'Add Freelancer'}
      </Button>
    </form>
  );
}
