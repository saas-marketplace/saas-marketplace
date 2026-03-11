"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function TeamTable() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    async function fetchTeam() {
      const { data } = await supabase.from('users').select('*');
      setTeam(data || []);
    }
    fetchTeam();
  }, []);

  const handleRoleChange = async (id: number, role: string) => {
    await supabase.from('users').update({ role }).eq('id', id);
    setTeam((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
  };

  return (
    <table className="min-w-full bg-white">
      <thead>
        <tr>
          <th className="py-2">Name</th>
          <th className="py-2">Email</th>
          <th className="py-2">Role</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {team.map((member) => (
          <tr key={member.id}>
            <td className="py-2">{member.name}</td>
            <td className="py-2">{member.email}</td>
            <td className="py-2">{member.role}</td>
            <td className="py-2">
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                className="input"
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}