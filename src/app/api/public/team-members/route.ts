import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!_supabaseClient) {
    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseClient;
}

interface TeamMemberRow {
  id: string;
  display_name: string | null;
  role_label: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();

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

    if (error) {
      console.error('Error fetching public team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members', details: error.message }, { status: 500 });
    }

    const teamMembers = (data as TeamMemberRow[] || []).map((member) => ({
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

function getInitials(name: string): string {
  if (!name) return 'TM';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
