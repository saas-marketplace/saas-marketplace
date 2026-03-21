import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/audit-logs - Get audit logs (admin only)
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    // ✅ Safe user fetch with error handling
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Check role safely
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('role_label')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) throw memberError;

    const isAdmin =
      memberData?.role_label === 'Super Admin' ||
      memberData?.role_label === 'Admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action');
    const section = searchParams.get('section');

    // ✅ Safe parsing + limits (prevent abuse)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }

    if (section) {
      query = query.eq('section', section);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/audit-logs - Create an audit log entry
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    // ✅ Safe user fetch
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Safe body parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, section, details } = body;

    // ✅ Strong validation
    if (
      typeof action !== 'string' ||
      typeof section !== 'string' ||
      !action.trim() ||
      !section.trim()
    ) {
      return NextResponse.json(
        { error: 'Invalid or missing required fields' },
        { status: 400 }
      );
    }

    // ✅ Get user email safely
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) throw userError;

    // ✅ Insert log safely
    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        user_email: userData?.email || user.email || '',
        action: action.trim(),
        section: section.trim(),
        details: details ?? null, // ✅ prevent undefined issues
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}