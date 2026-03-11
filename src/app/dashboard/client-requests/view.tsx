"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface ClientRequest {
  id: number;
  name: string;
  email: string;
  message: string;
  user_id: string | null;
}

export default function ViewClientRequests() {
  const [clientRequests, setClientRequests] = useState<ClientRequest[]>([]);

  useEffect(() => {
    const fetchClientRequests = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('client_requests').select('*');
      if (!error && data) setClientRequests(data);
    };

    fetchClientRequests();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Client Requests</h1>
      {clientRequests.length > 0 ? (
        <ul>
          {clientRequests.map((request) => (
            <li key={request.id}>
              <p>Name: {request.name}</p>
              <p>Email: {request.email}</p>
              <p>Message: {request.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No client requests available yet.</p>
      )}
    </div>
  );
}
