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
  const isSuspendedRef = useRef(false); // Track suspended state to prevent loops

  // Track session ID to detect user changes
  const lastSessionRef = useRef<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (isCheckingRef.current) return;
    // Don't check if already suspended - avoid unnecessary requests
    if (isSuspendedRef.current) {
      setIsLoading(false);
      return;
    }
    isCheckingRef.current = true;
    
    try {
      // Use getSession which is more reliable
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;

      // Reset suspension state if user changed
      if (lastSessionRef.current !== userId) {
        lastSessionRef.current = userId;
        isSuspendedRef.current = false;
        setIsSuspended(false);
      }
      
      // Check team_members for suspension status
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('is_active, needs_access_restored')
        .eq('user_id', userId)
        .maybeSingle();

      if (teamMember) {
        const isSuspended = teamMember.is_active === false;
        setIsSuspended(isSuspended);
        isSuspendedRef.current = isSuspended;
        
        if (teamMember.needs_access_restored) {
          setIsRestored(true);
          // Clear the restored flag (one-time)
          await supabase
            .from('team_members')
            .update({ needs_access_restored: false })
            .eq('user_id', userId);
          // Hide after 5s
          setTimeout(() => setIsRestored(false), 5000);
        }
      } else {
        setIsSuspended(false);
        isSuspendedRef.current = false;
      }
    } catch (error) {
      // Silently ignore errors - user is not suspended by default
    } finally {
      isCheckingRef.current = false;
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Reset on mount
    fetchedRef.current = false;
    isSuspendedRef.current = false;
    lastSessionRef.current = null;
    checkStatus();
  }, []); // Run once on mount

  useEffect(() => {
    // Event-driven: auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: unknown) => {
      // Reset on any auth change
      fetchedRef.current = false;
      isSuspendedRef.current = false;
      await checkStatus();
    });

    // Realtime subscription - simplified, auth listener handles updates
    const realtimeSub = { unsubscribe: () => {} };

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

  // NOTE: Do NOT redirect here - just show the message.
  // The user stays on the dashboard and sees the suspension message.
  // Redirects can cause loops when combined with auth state changes.

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
          Account Suspended
        </h2>
        <p className='text-lg text-slate-600 mb-6 text-center max-w-md leading-relaxed'>
          Your account has been suspended by the administrator. Please contact support for more information.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

