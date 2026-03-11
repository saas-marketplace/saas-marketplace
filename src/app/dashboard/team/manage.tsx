"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  user_id: string | null;
}

export default function ManageTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('team_members').select('*');
      if (!error && data) setTeamMembers(data);
    };

    fetchTeamMembers();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Team</h1>
      {teamMembers.length > 0 ? (
        <ul>
          {teamMembers.map((member) => (
            <li key={member.id}>
              <p>Name: {member.name}</p>
              <p>Role: {member.role}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No team members available yet.</p>
      )}
    </div>
  );
}
