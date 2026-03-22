"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Folder, Users, Package, MessageSquare, UsersRound, FileText, Loader2, Settings } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionSection } from '@/types/permissions';

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: PermissionSection;
}

const allLinks: SidebarLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
  { href: '/dashboard/domains', label: 'Domains', icon: Folder, section: 'domains' },
  { href: '/dashboard/freelancers', label: 'Freelancers', icon: Users, section: 'freelancers' },
  { href: '/dashboard/products', label: 'Products', icon: Package, section: 'products' },
  { href: '/dashboard/blog', label: 'Blog', icon: FileText, section: 'blogs' },
  { href: '/dashboard/requests', label: 'Client Requests', icon: MessageSquare, section: 'requests' },
  { href: '/dashboard/team', label: 'Team Members', icon: UsersRound, section: 'team' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, section: 'dashboard' },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const { accessibleSections, isSuperAdmin, isLoading: permsLoading } = useUserPermissions();

  const filteredLinks = allLinks.filter(link => {
    // Always show dashboard link, permission checked in page
    if (link.section === 'dashboard') return true;
    return accessibleSections.includes(link.section);
  });

  if (permsLoading) {
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
