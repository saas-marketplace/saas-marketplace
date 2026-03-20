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

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = userData?.role ?? null;

  if (!userRole) return { status: 'removed' as const, role: null };

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('is_active, needs_access_restored')
    .eq('user_id', user.id)
    .maybeSingle();

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