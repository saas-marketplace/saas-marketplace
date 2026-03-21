import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/user-settings
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Try to fetch settings
    let { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // ✅ If not exist → create safely using upsert (avoids race conditions)
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            notification_settings: {}, // default
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (createError) throw createError;

      settings = newSettings;
    }

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PATCH /api/user-settings
export async function PATCH(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_settings } = body;

    // ✅ Validate input (VERY important)
    if (
      notification_settings !== undefined &&
      typeof notification_settings !== 'object'
    ) {
      return NextResponse.json(
        { error: 'Invalid notification_settings format' },
        { status: 400 }
      );
    }

    // ✅ Upsert safely
    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          notification_settings: notification_settings ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}