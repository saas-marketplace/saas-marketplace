"use client";

import { useEffect, useState, useMemo } from 'react';
import { Users, Package, MessageSquare, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { SectionAccessGuard } from '@/components/ui/section-access-guard';

interface DashboardStats {
  freelancers: number;
  products: number;
  clientRequests: number;
  teamMembers: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    freelancers: 0,
    products: 0,
    clientRequests: 0,
    teamMembers: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch stats - only once on mount
  useEffect(() => {
    if (authLoading) return;
    
    let fetched = false;
    
    const fetchStats = async () => {
      if (fetched) return;
      fetched = true;
      
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      try {
        const [
          { count: freelancers },
          { count: products },
          { count: clientRequests },
          { count: teamMembers }
        ] = await Promise.all([
          supabase.from('freelancers').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('requests').select('*', { count: 'exact', head: true }),
          supabase.from('team_members').select('*', { count: 'exact', head: true })
        ]);
        
        setStats({
          freelancers: freelancers || 0,
          products: products || 0,
          clientRequests: clientRequests || 0,
          teamMembers: teamMembers || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, [authLoading]);

  // Memoize stat cards
  const statCards = useMemo(() => [
    { title: 'Total Freelancers', value: stats.freelancers, icon: Users, color: 'from-blue-500 to-blue-600' },
    { title: 'Total Products', value: stats.products, icon: Package, color: 'from-purple-500 to-purple-600' },
    { title: 'Client Requests', value: stats.clientRequests, icon: MessageSquare, color: 'from-green-500 to-green-600' },
    { title: 'Team Members', value: stats.teamMembers, icon: UserPlus, color: 'from-orange-500 to-orange-600' }
  ], [stats]);

  if (authLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500'></div>
      </div>
    );
  }

  return (
    <SectionAccessGuard section="dashboard" action="view">
      <div>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2'>
            Dashboard Overview
          </h1>
          <p className='text-slate-600'>Welcome to your admin dashboard</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className='group bg-white/70 backdrop-blur-sm border border-slate-200/50 shadow-lg rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:bg-white'>
                <div className='flex items-center justify-between mb-4'>
                  <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className='w-6 h-6 text-white drop-shadow-md' />
                  </div>
                </div>
                <p className='text-sm font-medium text-slate-600 uppercase tracking-wide mb-1'>{card.title}</p>
                <p className='text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
                  {statsLoading ? <div className='w-8 h-8 border-4 border-slate-200 border-t-slate-400 rounded-full animate-spin' /> : card.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200/50 rounded-2xl p-6'>
            <h3 className='text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900'>Quick Actions</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <Button variant='outline' className='h-12' asChild><Link href='/dashboard/freelancers'> <Users className='w-4 h-4 mr-2' /> Manage Freelancers </Link></Button>
              <Button variant='outline' className='h-12' asChild><Link href='/dashboard/products'> <Package className='w-4 h-4 mr-2' /> View Products </Link></Button>
              <Button variant='outline' className='h-12' asChild><Link href='/dashboard/requests'> <MessageSquare className='w-4 h-4 mr-2' /> Client Requests </Link></Button>
              <Button variant='outline' className='h-12' asChild><Link href='/dashboard/team'> <UserPlus className='w-4 h-4 mr-2' /> Team Members </Link></Button>
            </div>
          </div>
          <div className='bg-white border border-slate-200 rounded-2xl p-6 shadow-sm'>
            <h3 className='text-lg font-semibold mb-4 text-slate-900'>Recent Activity</h3>
            <div className='space-y-3'>
              <div className='flex items-center gap-3 p-3 bg-slate-50 rounded-lg'>
                <div className='w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center'>
                  <MessageSquare className='w-4 h-4 text-green-600' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-slate-900 truncate'>New client request</p>
                  <p className='text-xs text-slate-500'>2 minutes ago</p>
                </div>
              </div>
              <div className='flex items-center gap-3 p-3 bg-slate-50 rounded-lg'>
                <div className='w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center'>
                  <Users className='w-4 h-4 text-blue-600' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-slate-900 truncate'>Freelancer profile updated</p>
                  <p className='text-xs text-slate-500'>1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionAccessGuard>
  );
}
