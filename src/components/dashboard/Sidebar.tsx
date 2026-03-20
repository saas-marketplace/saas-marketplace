"use client";

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Folder, Users, Package, MessageSquare, UsersRound, FileText, Loader2 } from 'lucide-react';

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
}

const allLinks: SidebarLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
  { href: '/dashboard/domains', label: 'Domains', icon: Folder, section: 'domains' },
  { href: '/dashboard/freelancers', label: 'Freelancers', icon: Users, section: 'freelancers' },
  { href: '/dashboard/products', label: 'Products', icon: Package, section: 'products' },
  { href: '/dashboard/blog', label: 'Blog', icon: FileText, section: 'blogs' },
  { href: '/dashboard/requests', label: 'Client Requests', icon: MessageSquare, section: 'requests' },
  { href: '/dashboard/team', label: 'Team Members', icon: UsersRound, section: 'team' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [accessibleSections, setAccessibleSections] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Using Supabase client directly to get user role
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single();

        let userRole = userData?.role || 'user';

        // If role is not set in users table, check team_members table
        if (!userData?.role) {
          const { data: memberData } = await supabase
            .from('team_members')
            .select('role_label')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (memberData?.role_label) {
            if (memberData.role_label === 'Super Admin') {
              userRole = 'super_admin';
            } else if (memberData.role_label === 'Admin') {
              userRole = 'admin';
            }
          }
        }
        
        // Super admin has access to all sections
        if (userRole === 'super_admin') {
          setIsSuperAdmin(true);
          setAccessibleSections(['dashboard', 'domains', 'freelancers', 'products', 'blogs', 'requests', 'team']);
        } else if (userRole === 'admin') {
          // Check team_members for permissions
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('permissions, is_active')
            .eq('user_id', authUser.id)
            .eq('is_active', true)
            .single();

          if (teamMember?.permissions) {
            const sections = Object.keys(teamMember.permissions).filter(
              section => teamMember.permissions[section]?.includes('view')
            );
            setAccessibleSections(['dashboard', ...sections]);
          } else {
            setAccessibleSections(['dashboard']);
          }
        } else {
          setAccessibleSections(['dashboard']);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const filteredLinks = allLinks.filter(link => 
    link.section === 'dashboard' || accessibleSections.includes(link.section)
  );

  if (loading) {
    return (
      <div className="w-64 bg-[rgb(15,23,42)] text-slate-100 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="w-64 bg-[rgb(15,23,42)] text-slate-100 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="font-bold text-cyan-400 text-lg">M</span>
          </div>
          <div>
            <span className="text-lg font-bold">Milit Company</span>
            <p className="text-xs text-slate-400">
              {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">© 2024 Milit Company</p>
      </div>
    </div>
  );
}
