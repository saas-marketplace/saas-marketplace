import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Make this route dynamic since it doesn't need static rendering
export const dynamic = 'force-dynamic';

// GET - Fetch team members for public display (home page)
// No authentication required - returns only public team member info
export async function GET() {
  try {
    // Use service role key to bypass RLS for public API
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all team members directly from team_members table
    console.log('Fetching team members from Supabase...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        display_name,
        role_label,
        avatar_url,
        is_active
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log('Supabase response - data:', data);
    console.log('Supabase response - error:', error);

    if (error) {
      console.error('Error fetching public team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members', details: error.message }, { status: 500 });
    }

    // Transform data to match expected format
    const teamMembers = (data || []).map((member) => ({
      name: member.display_name || 'Team Member',
      role: member.role_label || 'Team Member',
      avatar_url: member.avatar_url || null,
      initials: getInitials(member.display_name || 'TM'),
    }));

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error in public team members API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper function to get initials from name
function getInitials(name: string): string {
  if (!name) return 'TM';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}