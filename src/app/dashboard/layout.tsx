import { ReactNode } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Sidebar from '@/components/dashboard/Sidebar';
import Topbar from '@/components/dashboard/Topbar';
import { SuspendedProvider, SuspendedContent } from '@/components/ui/suspended-context';
import { AlertTriangle } from 'lucide-react';

async function getUserStatus(): Promise<{ status: 'unauthenticated' | 'active'; role: string; permissions: Record<string, string[]> }> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, return unauthenticated - but don't redirect
  if (!user) {
    return { status: 'unauthenticated' as const, role: 'user', permissions: {} as Record<string, string[]> };
  }

  // Get role from users table - role is guaranteed to be "user", "admin", or "super_admin"
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // Role from users table ONLY - role_label is display-only
  const userRole = userData?.role || 'user';

  // Get permissions for admin users
  let permissions: Record<string, string[]> = {};
  if (userRole === 'admin') {
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('permissions')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (teamMember?.permissions) {
      permissions = typeof teamMember.permissions === 'string'
        ? JSON.parse(teamMember.permissions)
        : teamMember.permissions;
    }
  }

  // All authenticated users with valid role are active
  return { status: 'active' as const, role: userRole, permissions };

}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { role: userRole, permissions } = await getUserStatus();

  // Always show sidebar and topbar for authenticated users
  // Permission checks are handled per-section, not globally
  const showSidebar = userRole === 'super_admin' || userRole === 'admin';

  return (
    <SuspendedProvider>
      <div className="flex h-screen overflow-hidden bg-white">
        {showSidebar && <Sidebar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 bg-white">
            <SuspendedContent>
              {children}
            </SuspendedContent>
          </main>
        </div>
      </div>
    </SuspendedProvider>
  );
}
