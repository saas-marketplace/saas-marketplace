"use client";

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Folder, Users, Package, MessageSquare, UsersRound, FileText } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/domains', label: 'Domains', icon: Folder },
  { href: '/dashboard/freelancers', label: 'Freelancers', icon: Users },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/blog', label: 'Blog', icon: FileText },
  { href: '/dashboard/requests', label: 'Client Requests', icon: MessageSquare },
  { href: '/dashboard/team', label: 'Team Members', icon: UsersRound },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-[rgb(15,23,42)] text-slate-100 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="font-bold text-cyan-400 text-lg">M</span>
          </div>
          <div>
            <span className="text-lg font-bold">Milit Company</span>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {links.map((link) => {
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
