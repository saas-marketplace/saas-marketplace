import { ReactNode } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import Topbar from '@/components/dashboard/Topbar';

async function getUserStatus() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: 'unauthenticated' as const, role: null };

  // Get role from users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  let userRole = userData?.role ?? null;

  // Get team_member data for role and status fallback
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role_label, is_active, needs_access_restored')
    .eq('user_id', user.id)
    .maybeSingle();

  // If role is not set in users table, use team_members role_label
  if (!userRole && teamMember?.role_label) {
    if (teamMember.role_label === 'Super Admin') {
      userRole = 'super_admin';
    } else if (teamMember.role_label === 'Admin') {
      userRole = 'admin';
    } else {
      userRole = 'user';
    }
  }

  // If still no role, default to user
  userRole = userRole || 'user';

  // Check team_members.is_active for suspended status (fallback)
  if (teamMember && teamMember.is_active === false) {
    return { status: 'suspended' as const, role: userRole };
  }

  if (teamMember && teamMember.needs_access_restored) {
    return { status: 'needs_restore' as const, role: userRole };
  }

  // If no team_member row, user is removed
  if (!teamMember && userRole === 'user') {
    return { status: 'removed' as const, role: userRole };
  }

  // If no team_member row, user is removed
  if (!teamMember) {
    return { status: 'removed' as const, role: userRole };
  }

  if (!teamMember.is_active) {
    return { status: 'suspended' as const, role: userRole };
  }

  if (teamMember.needs_access_restored) {
    return { status: 'needs_restore' as const, role: userRole };
  }

  return { status: 'active' as const, role: userRole };
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { status, role: userRole } = await getUserStatus();

  // Server-side redirects — no client components, no blank flash
  if (status === 'unauthenticated') redirect('/auth/login');
  if (status === 'removed')        redirect('/verify-access');
  if (status === 'suspended')      redirect('/verify-access');
  if (status === 'needs_restore')  redirect('/verify-access');

  // Preserve original sidebar logic — only admin roles get the sidebar.
  // team_member gets the content area without a sidebar nav.
  const showSidebar = userRole === 'admin' || userRole === 'super_admin';

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {showSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}