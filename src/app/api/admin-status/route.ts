import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin-status
 *
 * Returns the first admin/super_admin's user_id + live online status.
 *
 * WHY THIS EXISTS:
 * The browser Supabase client is subject to RLS. Regular (non-admin) users
 * cannot query the `users` table to find the admin's user_id, so the
 * client-side `setupAdmin()` always got an empty result and the user-facing
 * requests page perpetually showed "Offline" even when the admin was online.
 *
 * This route uses the service-role key (server-only, never exposed to the
 * browser) to bypass RLS and return exactly what the user page needs.
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find the first admin/super_admin user ID
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'super_admin']);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      return NextResponse.json({ admins: [] });
    }

    // Fetch status for ALL admins in parallel
    const statusPromises = adminUsers.map(async (admin: any) => {
      const { data: statusData } = await supabase
        .from('user_status')
        .select('is_online, last_seen')
        .eq('user_id', admin.id)
        .maybeSingle();
      return {
        id: admin.id,
        online: statusData?.is_online ?? false,
        lastSeen: statusData?.last_seen ?? null,
      };
    });

    const admins = await Promise.all(statusPromises);

    return NextResponse.json({ admins });
  } catch (err) {
    console.error('[admin-status] Error:', err);
    return NextResponse.json({ adminId: null, isOnline: false, lastSeen: null }, { status: 500 });
  }
}