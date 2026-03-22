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

  // Show sidebar only if super_admin or admin with dashboard access
  let showSidebar = userRole === 'super_admin';
  
  if (userRole === 'admin') {
    // Check if admin has dashboard view permission
    const hasDashboardAccess = permissions.dashboard?.includes('view') || false;
    showSidebar = hasDashboardAccess;
  }

  // Show access denied screen if user doesn't have dashboard access
  if (!showSidebar) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
          <div className="bg-red-100 rounded-full p-4 mb-4">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the dashboard. Please contact your administrator.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

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
