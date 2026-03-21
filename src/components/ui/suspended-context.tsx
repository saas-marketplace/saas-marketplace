"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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

  const checkStatus = useCallback(async () => {
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
        if (teamMember.is_active === false) {
          setIsSuspended(true);
        } else {
          setIsSuspended(false);
        }
        
        if (teamMember.needs_access_restored) {
          // Show restored message
          setIsRestored(true);
          // Clear the restored flag in DB
          await supabase
            .from('team_members')
            .update({ needs_access_restored: false })
            .eq('user_id', user.id);
          
          // Hide restored message after 5 seconds
          setTimeout(() => setIsRestored(false), 5000);
        }
      } else {
        setIsSuspended(false);
      }
    } catch (error) {
      console.error('Error checking suspension status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkStatus();

    // Poll every 5 seconds to check for status changes
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <SuspendedContext.Provider value={{ isSuspended, isRestored, isLoading, checkStatus }}>
      {children}
    </SuspendedContext.Provider>
  );
}

// Export the suspended content wrapper component
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

export function SuspendedContent({ children }: { children?: React.ReactNode }) {
  const { isSuspended, isRestored, isLoading } = useSuspended();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Show restored message if access was just restored
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

  // If suspended, show message but still render children (for layout)
  if (isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-4 mb-4">
          <AlertTriangle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your account is suspended</h2>
        <p className="text-gray-600 text-center max-w-md">
          You cannot access or interact with data at this time. 
          Please contact your administrator to restore access.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4" />
          <span>Checking status automatically...</span>
        </div>
      </div>
    );
  }

  // Not suspended - render children normally
  return <>{children}</>;
}
