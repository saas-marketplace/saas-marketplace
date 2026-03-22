import { ReactNode } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Sidebar from '@/components/dashboard/Sidebar';
import Topbar from '@/components/dashboard/Topbar';
import { SuspendedProvider, SuspendedContent } from '@/components/ui/suspended-context';

async function getUserStatus() {
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
    return { status: 'unauthenticated' as const, role: 'user' };
  }

  // Get role from users table - role is guaranteed to be "user", "admin", or "super_admin"
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // Role from users table ONLY - role_label is display-only
  const userRole = userData?.role || 'user';

  // All authenticated users with valid role are active
  return { status: 'active' as const, role: userRole };

}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { role: userRole } = await getUserStatus();

  // Show sidebar for admin and super_admin roles
  const showSidebar = userRole === 'admin' || userRole === 'super_admin';

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
