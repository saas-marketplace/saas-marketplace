"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EnterprisePage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Enterprise <span className="gradient-text">Solutions</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Custom solutions for large organizations
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="border rounded-xl p-8 bg-card mb-8">
            <h2 className="text-2xl font-bold mb-4">Why Choose Enterprise?</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li>✓ Dedicated account manager</li>
              <li>✓ Custom integrations</li>
              <li>✓ SLA guarantee</li>
              <li>✓ 24/7 priority support</li>
              <li>✓ White-label solutions</li>
              <li>✓ Advanced analytics</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground mb-6">
              Ready to get started? Contact our enterprise team today.
            </p>
            <Button asChild>
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
