import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/notifications - Get user's notifications
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Get user settings safely
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('notification_settings')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const notificationSettings = userSettings?.notification_settings || {};

    // ✅ Get notifications safely
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // ✅ Safe filtering (avoid undefined crash)
    const filteredNotifications = (notifications || []).filter((notification: any) => {
      const settingKey = `${notification.type}_alerts`;
      return notificationSettings?.[settingKey] !== false;
    });

    return NextResponse.json({
      notifications: filteredNotifications,
      unreadCount: filteredNotifications.filter((n: any) => !n.is_read).length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}


// POST /api/notifications - Create a notification
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { user_id, type, title, message, link } = body;

    // ✅ Strong validation
    if (
      typeof user_id !== 'string' ||
      typeof type !== 'string' ||
      typeof title !== 'string' ||
      typeof message !== 'string' ||
      !user_id || !type || !title || !message
    ) {
      return NextResponse.json(
        { error: 'Invalid or missing required fields' },
        { status: 400 }
      );
    }

    // ✅ REMOVED: Role restriction - notifications work for ALL users
    // Previously checked if user was admin, now any authenticated user can create notifications

    // ✅ Insert safely
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type: type.trim(),
        title: title.trim(),
        message: message.trim(),
        link: link ?? null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}


// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { notification_ids, mark_all } = body;

    if (mark_all) {
      // ✅ Mark all safely
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

    } else if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      // ✅ Validate IDs
      const validIds = notification_ids.filter((id: any) => typeof id === 'string');

      if (validIds.length === 0) {
        return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', validIds);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}


// DELETE /api/notifications - Delete notifications
export async function DELETE(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clear_all') === 'true';

    if (!clearAll) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // ✅ Delete safely
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}