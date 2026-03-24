"use client";

import { ReactNode } from 'react';
import { usePermissions } from '@/stores/permissions-context';
import { Lock } from 'lucide-react';
import type { PermissionSection } from '@/types/permissions';

interface SectionAccessGuardProps {
  children: ReactNode;
  section: string;
  action?: 'view' | 'create' | 'update' | 'delete';
  fallback?: ReactNode;
}

export function SectionAccessGuard({ 
  children, 
  section, 
  action = 'view',
  fallback 
}: SectionAccessGuardProps) {
  const { permissions, isLoading, isSuperAdmin } = usePermissions();

  // Show loading state while permissions are being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Super admin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check if user has permission for this section and action
  const sectionPermissions = (permissions as Record<string, string[]>)[section] || [];
  const hasAccess = sectionPermissions.includes(action);

  if (!hasAccess) {
    // Show custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show default "No Access" message
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="flex flex-col items-center justify-center max-w-md text-center">
          <div className="bg-amber-100 rounded-full p-4 mb-4">
            <Lock className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Access</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this section. Please contact your administrator if you believe this is an error.
          </p>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}
