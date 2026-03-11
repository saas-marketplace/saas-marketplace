import { createClient } from '@/lib/supabase/client';

export default async function testDynamicBehavior() {
  const supabase = createClient();

  const tables = ['freelancers', 'products', 'client_requests'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error testing ${table}:`, error);
    } else {
      console.log(`Data from ${table}:`, data);
    }
  }

  console.log('Dynamic behavior test completed.');
}