"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
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

type Freelancer = {
  id: string;
  display_name: string;
  title: string | null;
  domain: string | null;
  skills: string[];
  experience_level: string | null;
  completed_projects: number;
  is_available: boolean;
  avatar_url: string | null;
};

export default function FreelancerTable() {
  const supabase = createClient();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const { all, isLoading: permsLoading } = usePermissions();

  useEffect(() => {
    async function fetchFreelancers() {
      const { data } = await supabase
        .from('freelancers')
        .select('*, domain:domains(id, name)')
        .order('created_at', { ascending: false });
      
      if (data) {
        const parsedData = data.map((f: any) => ({
          ...f,
          skills: Array.isArray(f.skills) ? f.skills : [],
          domain: f.domain?.name || null,
          id: f.id.toString()
        }));
        setFreelancers(parsedData as Freelancer[]);
      }
      setLoading(false);
    }
    fetchFreelancers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this freelancer?')) return;
    
    const { error } = await supabase.from('freelancers').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      return;
    }
    
    setFreelancers(prev => prev.filter(f => f.id !== id));
  };

  const canManageFreelancers = all.freelancers.includes('update') || all.freelancers.includes('delete');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || permsLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /> Loading...</div>;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 font-medium">Freelancer</th>
            <th className="text-left p-4 font-medium">Domain</th>
            <th className="text-left p-4 font-medium">Skills</th>
            <th className="text-left p-4 font-medium">Experience</th>
            <th className="text-left p-4 font-medium">Projects</th>
            <th className="text-left p-4 font-medium">Status</th>
            {canManageFreelancers && <th className="text-right p-4 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {freelancers.map((freelancer) => (
            <tr key={freelancer.id} className="hover:bg-muted/50">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {freelancer.avatar_url ? (
                    <Image 
                      src={freelancer.avatar_url} 
                      alt={freelancer.display_name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(freelancer.display_name)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{freelancer.display_name}</p>
                    <p className="text-sm text-gray-500">{freelancer.title || 'No title'}</p>
                  </div>
                </div>
              </td>
              <td className="p-4 text-gray-600">{freelancer.domain || '-'}</td>
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {freelancer.skills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                  {freelancer.skills.length > 3 && (
                    <span className="text-xs text-gray-500">+{freelancer.skills.length - 3}</span>
                  )}
                </div>
              </td>
              <td className="p-4 text-gray-600">{freelancer.experience_level || '-'}</td>
              <td className="p-4 text-gray-600">{freelancer.completed_projects}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  freelancer.is_available 
                    ? 'bg-green-50 text-green-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {freelancer.is_available ? 'Available' : 'Unavailable'}
                </span>
              </td>
              {canManageFreelancers && (
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {all.freelancers.includes('update') && (
                        <DropdownMenuItem>
                          Edit Freelancer
                          <Edit className="w-4 h-4 ml-auto" />
                        </DropdownMenuItem>
                      )}
                      {all.freelancers.includes('delete') && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(freelancer.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                          <Trash2 className="w-4 h-4 ml-auto" />
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
          {freelancers.length === 0 && (
            <tr>
              <td colSpan={canManageFreelancers ? 7 : 6} className="p-8 text-center text-muted-foreground">
                No freelancers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
