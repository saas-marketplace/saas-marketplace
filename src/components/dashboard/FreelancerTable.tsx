"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Freelancer = {
  id: number;
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
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

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
        }));
        setFreelancers(parsedData);
      }
    }
    fetchFreelancers();
  }, []);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Freelancer</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Domain</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Skills</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Experience</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Projects</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Status</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {freelancers.map((freelancer) => (
            <tr key={freelancer.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {freelancer.avatar_url ? (
                    <img 
                      src={freelancer.avatar_url} 
                      alt={freelancer.display_name}
                      className="w-10 h-10 rounded-full object-cover"
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
              <td className="py-3 px-4 text-sm text-gray-600">
                {freelancer.domain || '-'}
              </td>
              <td className="py-3 px-4">
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
              <td className="py-3 px-4 text-sm text-gray-600">
                {freelancer.experience_level || '-'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {freelancer.completed_projects}
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  freelancer.is_available 
                    ? 'bg-green-50 text-green-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {freelancer.is_available ? 'Available' : 'Unavailable'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <button className="text-blue-500 hover:text-blue-700 text-sm">Edit</button>
                  <button className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
