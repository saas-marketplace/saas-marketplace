import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/notifications - Get user's notifications
// Only super admins can access this endpoint - they see all notifications
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let isSuperAdmin = userData?.role === 'super_admin';

    // Check team_members for role_label override
    if (!isSuperAdmin) {
      const { data: memberData } = await supabase
        .from('team_members')
        .select('role_label')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData?.role_label === 'Super Admin') {
        isSuperAdmin = true;
      }
    }

    // Only super admins can access notifications
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get all notifications (no filtering for super admin)
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: (notifications || []).filter((n: any) => !n.is_read).length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}


// Helper function to check if user is super admin
async function checkSuperAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  let isSuperAdmin = userData?.role === 'super_admin';

  if (!isSuperAdmin) {
    const { data: memberData } = await supabase
      .from('team_members')
      .select('role_label')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberData?.role_label === 'Super Admin') {
      isSuperAdmin = true;
    }
  }

  return isSuperAdmin;
}

// POST /api/notifications - Create a notification (Super Admin only)
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const isSuperAdmin = await checkSuperAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
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


// PATCH /api/notifications - Mark notifications as read (Super Admin only)
export async function PATCH(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const isSuperAdmin = await checkSuperAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
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


// DELETE /api/notifications - Delete notifications (Super Admin only)
export async function DELETE(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const isSuperAdmin = await checkSuperAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clear_all') === 'true';

    if (!clearAll) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // ✅ Delete all notifications (super admin can delete all)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (trick since we can't do delete all directly)

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