"use client";

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Bell, Search, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>('Admin');

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email.split('@')[0]);
      }
    }
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className={cn(
      'bg-black border-b border-white/10 px-6 py-3 flex justify-between items-center'
    )}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-64"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="h-6 w-px bg-gray-700"></div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-700">{userEmail}</span>
          <LogOut className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
