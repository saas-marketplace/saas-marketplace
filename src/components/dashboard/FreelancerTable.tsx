"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Freelancer = {
  id: number;
  name: string;
  domain: string;
  skills: string;
  experience: string;
  portfolio_link: string;
  status: string;
};

export default function FreelancerTable() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

  useEffect(() => {
    async function fetchFreelancers() {
      const { data } = await supabase.from('freelancers').select('*');
      setFreelancers(data || []);
    }
    fetchFreelancers();
  }, []);

  return (
    <table className="min-w-full bg-white">
      <thead>
        <tr>
          <th className="py-2">Name</th>
          <th className="py-2">Domain</th>
          <th className="py-2">Skills</th>
          <th className="py-2">Experience</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {freelancers.map((freelancer) => (
          <tr key={freelancer.id}>
            <td className="py-2">{freelancer.name}</td>
            <td className="py-2">{freelancer.domain}</td>
            <td className="py-2">{freelancer.skills}</td>
            <td className="py-2">{freelancer.experience}</td>
            <td className="py-2">
              <button className="text-blue-500">Edit</button>
              <button className="text-red-500 ml-2">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}