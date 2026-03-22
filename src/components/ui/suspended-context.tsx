"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

interface SuspendedContextType {
  isSuspended: boolean;
  isRestored: boolean;
  isLoading: boolean;
  checkStatus: () => Promise<void>;
}

const SuspendedContext = createContext<SuspendedContextType>({
  isSuspended: false,
  isRestored: false,
  isLoading: true,
  checkStatus: async () => {},
});

export function useSuspended() {
  return useContext(SuspendedContext);
}

export function SuspendedProvider({ children }: { children: React.ReactNode }) {
  const [isSuspended, setIsSuspended] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const isCheckingRef = useRef(false);
  const fetchedRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check team_members for suspension status
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('is_active, needs_access_restored')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teamMember) {
        setIsSuspended(teamMember.is_active === false);
        
        if (teamMember.needs_access_restored) {
          setIsRestored(true);
          // Clear the restored flag (one-time)
          await supabase
            .from('team_members')
            .update({ needs_access_restored: false })
            .eq('user_id', user.id);
          // Hide after 5s
          setTimeout(() => setIsRestored(false), 5000);
        }
      } else {
        setIsSuspended(false);
      }
    } catch (error) {
      console.error('Error checking suspension status:', error);
    } finally {
      isCheckingRef.current = false;
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      checkStatus(); // Initial check
    }

    // Event-driven: auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
      await checkStatus();
    });

    // Realtime subscription on team_members for this user
    const realtimeSub = supabase
      .channel('team_member_status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'team_members', filter: `user_id=eq.${supabase.auth.getUser().data?.user?.id}` },
        () => checkStatus()
      )
      .subscribe();

    return () => {
      if (authListener?.subscription && typeof authListener.subscription.unsubscribe === 'function') {
        authListener.subscription.unsubscribe();
      }
      if (realtimeSub && typeof realtimeSub.unsubscribe === 'function') {
        supabase.removeChannel(realtimeSub);
      }
    };
  }, [checkStatus, supabase]);

  return (
    <SuspendedContext.Provider value={{ isSuspended, isRestored, isLoading, checkStatus }}>
      {children}
    </SuspendedContext.Provider>
  );
}

export function SuspendedContent({ children }: { children?: React.ReactNode }) {
  const { isSuspended, isRestored, isLoading } = useSuspended();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (isRestored) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full p-4 mb-4">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your access has been restored!</h2>
        <p className="text-gray-600">You now have full access to the dashboard.</p>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className='flex flex-col items-center justify-center h-[400px] bg-white p-8 mx-auto max-w-2xl'>
        <AlertTriangle className='w-16 h-16 text-red-400 mb-4 drop-shadow-lg' />
        <h2 className='text-2xl font-bold text-slate-900 mb-2 text-center'>
          Access Denied
        </h2>
        <p className='text-lg text-slate-600 mb-6 text-center max-w-md leading-relaxed'>
          your account is suspended you cant access any section
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

