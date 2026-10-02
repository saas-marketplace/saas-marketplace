"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Folder, Users, Package, MessageSquare, UsersRound, FileText, Loader2, Settings, UserCog, Mail, CreditCard, Repeat, Wallet, Smartphone } from 'lucide-react';
import { usePermissions } from '@/stores/permissions-context';
import { PermissionSection } from '@/types/permissions';

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: PermissionSection;
  superAdminOnly?: boolean;
}

const allLinks: SidebarLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
  { href: '/dashboard/domains', label: 'Domains', icon: Folder, section: 'domains' },
  { href: '/dashboard/freelancers', label: 'Freelancers', icon: Users, section: 'freelancers' },
  { href: '/dashboard/products', label: 'Products', icon: Package, section: 'products' },
  { href: '/dashboard/blog', label: 'Blog', icon: FileText, section: 'blogs' },
  { href: '/dashboard/requests', label: 'Client Requests', icon: MessageSquare, section: 'requests' },
  { href: '/dashboard/team', label: 'Team Members', icon: UsersRound, section: 'team' },
  // Super Admin only sections
  { href: '/dashboard/plans', label: 'Subscription Plans', icon: CreditCard, section: 'dashboard', superAdminOnly: true },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: Repeat, section: 'dashboard', superAdminOnly: true },
  { href: '/dashboard/payments', label: 'Payments', icon: Wallet, section: 'dashboard', superAdminOnly: true },
  { href: '/dashboard/d17', label: 'D17', icon: Smartphone, section: 'dashboard', superAdminOnly: true },
  { href: '/dashboard/users', label: 'Users', icon: UserCog, section: 'users' },
  { href: '/dashboard/contact-submissions', label: 'Contact Submissions', icon: Mail, section: 'contact_submissions' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, section: 'dashboard' },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const { accessibleSections, isSuperAdmin, isLoading: permsLoading } = usePermissions();
  // Reveals the thin scrollbar while the user is actively scrolling, even if
  // the pointer has moved away. Cleared shortly after scrolling stops.
  const [scrolling, setScrolling] = React.useState(false);

  const scrollIdleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = React.useCallback(() => {
    setScrolling(true);
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => setScrolling(false), 700);
  }, []);

  React.useEffect(() => {
    return () => {
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  const filteredLinks = allLinks.filter(link => {
    // Super-admin-only sections (subscription plans, subscriptions, payments, users)
    if (link.superAdminOnly) return isSuperAdmin;
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
    <div className="w-64 shrink-0 bg-[rgb(15,23,42)] text-slate-100 h-full flex flex-col">
      {/* Sidebar scroll styling: the bar is invisible until the sidebar is
          hovered or focused, then a slim slate thumb appears. Native scrolling
          (wheel / trackpad / touch / keyboard) is untouched. */}
      <style>{`
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .sidebar-scroll:hover,
        .sidebar-scroll:focus-within,
        .sidebar-scroll[data-scrolling='true'] {
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
        }
        .sidebar-scroll::-webkit-scrollbar { width: 8px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb,
        .sidebar-scroll:focus-within::-webkit-scrollbar-thumb,
        .sidebar-scroll[data-scrolling='true']::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.45);
          background-clip: content-box;
        }
      `}</style>

      <div className="p-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="font-bold text-cyan-400 text-lg">M</span>
          </div>
          <div>
            <span className="text-lg font-bold">Frilansiha Company</span>
            <p className="text-xs text-slate-400">
              {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
            </p>
          </div>
        </div>
      </div>

      {/* flex-1 + min-h-0 lets this shrink inside the h-screen flex column, so
          it scrolls on its own instead of pushing the page. */}
      <nav
        className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3"
        tabIndex={0}
        aria-label="Dashboard navigation"
        data-scrolling={scrolling}
        onScroll={handleScroll}
      >
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

      <div className="p-4 border-t border-slate-700 shrink-0">
        <p className="text-xs text-slate-500">© 2024 Frilansiha Company</p>
      </div>
    </div>
  );
}
