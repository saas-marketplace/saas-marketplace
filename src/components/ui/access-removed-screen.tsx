"use client";

import { UserX, ShieldX, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AccessRemovedScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-24 h-24 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
        <UserX className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
        Access Removed
      </h2>
      <p className="text-lg text-slate-600 mb-8 text-center max-w-md leading-relaxed">
        Your admin access has been removed from the team. You can no longer access the dashboard.
      </p>
      <div className="space-y-3 text-center">
        <Button variant="outline" asChild>
          <Link href="/access-restored">
            Access Restored
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">
            Go to Marketplace
          </Link>
        </Button>
      </div>
    </div>
  );
}
