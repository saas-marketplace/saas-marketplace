"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Users, Package, MessageSquare, UserPlus } from 'lucide-react';

interface DashboardStats {
  freelancers: number;
  products: number;
  clientRequests: number;
  teamMembers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    freelancers: 0,
    products: 0,
    clientRequests: 0,
    teamMembers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        const [
          { count: freelancers, error: freelancersError },
          { count: products, error: productsError },
          { count: clientRequests, error: requestsError },
          { count: teamMembers, error: teamError }
        ] = await Promise.all([
          supabase.from('freelancers').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('requests').select('*', { count: 'exact', head: true }),
          supabase.from('team_members').select('*', { count: 'exact', head: true })
        ]);

        console.log('Dashboard stats:', {
          freelancers, freelancersError,
          products, productsError,
          clientRequests, requestsError,
          teamMembers, teamError
        });

        setStats({
          freelancers: freelancers || 0,
          products: products || 0,
          clientRequests: clientRequests || 0,
          teamMembers: teamMembers || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Freelancers',
      value: stats.freelancers,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Products',
      value: stats.products,
      icon: Package,
      color: 'bg-purple-500'
    },
    {
      title: 'Client Requests',
      value: stats.clientRequests,
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Team Members',
      value: stats.teamMembers,
      icon: UserPlus,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-slate-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">
                  {loading ? '...' : card.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center shadow-md`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
