import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export default function EnsureDynamicContent() {
  useEffect(() => {
    const validateDynamicContent = async () => {
      const supabase = createClient();
      const tables = ['freelancers', 'products', 'client_requests'];

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.error(`Error fetching data from ${table}:`, error);
        } else {
          console.log(`Data from ${table}:`, data);
        }
      }
    };

    validateDynamicContent();
  }, []);

  return <div>Validating dynamic content...</div>;
}