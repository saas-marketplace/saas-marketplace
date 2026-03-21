import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper: check super admin safely
async function isSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('role_label')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Role check error:', error);
    return false;
  }

  return data?.role_label === 'Super Admin';
}

// GET /api/system-settings
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAllowed = await isSuperAdmin(supabase, user.id);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (error) throw error;

    // ✅ Safely parse JSON values
    const settingsObj = (settings || []).reduce((acc: Record<string, any>, setting: any) => {
      try {
        acc[setting.key] = JSON.parse(setting.value);
      } catch {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {});

    return NextResponse.json({ settings: settingsObj });

  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PATCH /api/system-settings
export async function PATCH(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAllowed = await isSuperAdmin(supabase, user.id);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    // ✅ Batch upsert instead of multiple queries (BIG performance win)
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('system_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}