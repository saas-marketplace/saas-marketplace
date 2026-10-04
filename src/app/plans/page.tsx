"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, CreditCard, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { formatTnd } from "@/lib/money";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_tnd: number;
  currency: string;
  interval: string;
  interval_count: number;
  features: string[];
  active: boolean;
  display_order: number;
}

const intervalLabel = (interval: string, count: number): string => {
  const unit = interval === "month" ? "month" : interval;
  if (count === 1) return unit;
  return `${count} ${unit}s`;
};

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // RLS exposes only active plans publicly; filter server-side as a guarantee.
      const res = await fetch("/api/public/plans");
      if (!res.ok) throw new Error("Could not load plans");
      const data = await res.json();
      setPlans((data.plans ?? []).filter((p: Plan) => p.active));
    } catch {
      setError("Could not load subscription plans right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const subscribe = async (_planId: string) => {
    if (!user) {
      window.location.href = "/auth/login?next=/plans";
      return;
    }

    // Subscription system is being updated — do NOT start the Flouci checkout
    // or create any order/payment/subscription. Just show the contact modal.
    setShowUpdateModal(true);
  };

  return (
    <div className="min-h-screen  pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Subscriptions
          </Badge>
          <h1 className="text-4xl font-bold mb-3">Choose your plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every plan is priced in TND. Recurring subscriptions are billed securely
            through Flouci, so Tunisian and international customers pay the same amount
            and Flouci handles every renewal automatically.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={loadPlans}>
              Try again
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No subscription plans available yet.</p>
            <p className="text-sm text-muted-foreground">Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="glass-card rounded-2xl p-6 flex flex-col"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold gradient-text">
                    {formatTnd(plan.price_tnd)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {intervalLabel(plan.interval, plan.interval_count)}
                  </span>
                </div>

                {(plan.features ?? []).length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  className="w-full gradient-bg text-white border-0 hover:opacity-90 mt-auto"
                  onClick={() => subscribe(plan.id)}
                >
                  Subscribe
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {!authLoading && !user && plans.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            You&apos;ll need to{" "}
            <Link href="/auth/login" className="text-cyan-500 hover:underline">
              sign in
            </Link>{" "}
            before subscribing.
          </p>
        )}

        {/* Subscription system update modal — shown instead of the old
            payment flow. No order/payment/subscription is created. */}
        <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
          <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                Subscriptions are being updated
              </DialogTitle>
              <DialogDescription>
                We are currently updating our subscription system. Please contact
                the owner to purchase a subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Button
                asChild
                className="flex-1 gradient-bg text-white border-0 hover:opacity-90"
              >
                <a
                  href="https://wa.me/21627160378"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact on WhatsApp
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowUpdateModal(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
