"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  User, 
  Users, 
  Shield, 
  Bell, 
  Settings as SettingsIcon, 
  Database,
  Loader2,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SettingsTab = 'profile' | 'team' | 'permissions' | 'notifications' | 'system' | 'utilities';

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  superAdminOnly?: boolean;
}

const settingsNavItems: SettingsNavItem[] = [
  { 
    id: 'profile', 
    label: 'Profile & Account', 
    description: 'Manage your profile, avatar, password, and account',
    icon: User,
    href: '/dashboard/settings/profile'
  },
  { 
    id: 'team', 
    label: 'Team Management', 
    description: 'Manage team members, roles, and invitations',
    icon: Users,
    href: '/dashboard/settings/team'
  },
  { 
    id: 'permissions', 
    label: 'Permissions & Access', 
    description: 'Configure permissions matrix for team members',
    icon: Shield,
    href: '/dashboard/settings/permissions'
  },
  { 
    id: 'notifications', 
    label: 'Notifications & Alerts', 
    description: 'Control notification preferences and alerts',
    icon: Bell,
    href: '/dashboard/settings/notifications'
  },
  { 
    id: 'system', 
    label: 'System Settings', 
    description: 'Configure integrations, branding, and system options',
    icon: SettingsIcon,
    href: '/dashboard/settings/system',
    superAdminOnly: true
  },
  { 
    id: 'utilities', 
    label: 'Utilities & Logs', 
    description: 'Export data, import users, and view audit logs',
    icon: Database,
    href: '/dashboard/settings/utilities'
  },
];

export default function SettingsPage() {
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Get role from users table
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        let role = userData?.role || 'user';

        // Check team_members for role_label override
        const { data: memberData } = await supabase
          .from('team_members')
          .select('role_label')
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberData?.role_label) {
          if (memberData.role_label === 'Super Admin') {
            role = 'super_admin';
          } else {
            role = 'admin';
          }
        }

        setIsSuperAdmin(role === 'super_admin');
        setIsAdmin(role === 'admin' || role === 'super_admin');
      } catch (error) {
        console.error('Error checking role:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [supabase]);

  // Filter items based on role
  const visibleItems = settingsNavItems.filter(
    item => !item.superAdminOnly || isSuperAdmin
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // If not admin, redirect or show access denied
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You do not have permission to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account, team, permissions, and system preferences</p>
      </div>

      <div className="grid gap-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-all duration-200
                ${isActive 
                  ? 'bg-cyan-50 border-cyan-200 shadow-sm' 
                  : 'bg-white border-gray-200 hover:border-cyan-300 hover:shadow-sm'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${isActive ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-600'}
              `}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${isActive ? 'text-cyan-900' : 'text-gray-900'}`}>
                  {item.label}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className={`w-5 h-5 ${isActive ? 'text-cyan-500' : 'text-gray-400'}`} />
            </Link>
          );
        })}
      </div>

      {isSuperAdmin && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Super Admin Mode:</strong> You have access to all settings including System Settings.
          </p>
        </div>
      )}
    </div>
  );
}
