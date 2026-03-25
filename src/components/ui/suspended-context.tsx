"use client";

/**
 * suspended-context.tsx
 * ══════════════════════
 * Suspension / access-restore UI for the dashboard.
 *
 * ✅ Zero DB calls — isSuspended / isRemoved come from AuthProvider.
 * ✅ needs_access_restored is read from the cached TeamMemberData.
 * ✅ One-time "restore" update still happens (write-only, no read duplication).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useTeamMember } from "@/hooks/useAuthQuery";
import { createClient } from "@/lib/supabase/client";

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

const supabase = createClient();

export function SuspendedProvider({ children }: { children: ReactNode }) {
  // ✅ Data comes from the shared cache — no extra DB calls
  const { authData, loading: authLoading } = useAuth();
  const { data: teamMember, isLoading: teamLoading } = useTeamMember(authData);

  const [isRestored, setIsRestored] = useState(false);
  const restoredHandledRef = { current: false };

  const isSuspended = teamMember?.is_active === false;
  const isLoading = authLoading || teamLoading;

  // Handle needs_access_restored — write-only update, no extra read
  useEffect(() => {
    if (
      !teamMember?.needs_access_restored ||
      restoredHandledRef.current ||
      !authData?.id
    )
      return;

    restoredHandledRef.current = true;
    setIsRestored(true);

    // Clear the flag (write-only — the cached data already had the value)
    supabase
      .from("team_members")
      .update({ needs_access_restored: false })
      .eq("user_id", authData.id)
      .then(() => {
        setTimeout(() => setIsRestored(false), 5000);
      });
  }, [teamMember?.needs_access_restored, authData?.id]);

  // checkStatus is kept for backward compat — it's now a no-op since state
  // is derived from the shared cache. Callers can call invalidateTeamMemberCache()
  // from useAuthQuery if they need a fresh fetch.
  const checkStatus = useCallback(async () => {}, []);

  return (
    <SuspendedContext.Provider
      value={{ isSuspended, isRestored, isLoading, checkStatus }}
    >
      {children}
    </SuspendedContext.Provider>
  );
}

export function SuspendedContent({ children }: { children?: ReactNode }) {
  const { isSuspended, isRestored, isLoading } = useSuspended();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (isRestored) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full p-4 mb-4">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your access has been restored!
        </h2>
        <p className="text-gray-600">You now have full access to the dashboard.</p>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-white p-8 mx-auto max-w-2xl">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4 drop-shadow-lg" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
          Account Suspended
        </h2>
        <p className="text-lg text-slate-600 mb-6 text-center max-w-md leading-relaxed">
          Your account has been suspended by the administrator. Please contact
          support for more information.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}