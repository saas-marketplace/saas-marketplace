"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * /subscription/fail — reached when the Flouci checkout fails or expires.
 * The subscription is NOT activated on this path.
 */
export default function SubscriptionFailPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-3">Payment failed or expired.</h1>
        <p className="text-muted-foreground mb-8">
          Your subscription was not activated. You can try again at any time from the plans
          page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/plans">
            <Button className="gradient-bg text-white border-0 hover:opacity-90">
              Back to Plans
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
