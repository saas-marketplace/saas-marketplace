"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * /subscription/success — reached after the Flouci checkout redirect.
 * The redirect itself does NOT activate the subscription: the status shown
 * here always comes from the backend, which relies on Flouci's webhook and
 * payment verification.
 */
export default function SubscriptionSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/subscription/me");
        if (!res.ok) throw new Error("not signed in");
        const data = await res.json();
        if (cancelled) return;
        setActive(Boolean(data.hasActiveAccess));
      } catch {
        if (!cancelled) setActive(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    if (!authLoading && user) {
      check();
      // The webhook may not have arrived yet — re-check a few times.
      const timers = [3_000, 8_000, 15_000].map((ms) => {
        const t = setTimeout(() => {
          setChecking(true);
          check();
        }, ms);
        return t;
      });
      return () => timers.forEach(clearTimeout);
    }

    setChecking(false);
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {checking ? (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-cyan-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">Payment processing…</h1>
            <p className="text-muted-foreground">
              Your payment is being confirmed. Please wait — this page updates automatically.
            </p>
          </>
        ) : active ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">Your subscription is active.</h1>
            <p className="text-muted-foreground mb-8">
              Thank you! Your recurring subscription was confirmed by Flouci and your access
              is now active.
            </p>
            <Link href="/profile">
              <Button className="gradient-bg text-white border-0 hover:opacity-90">
                View my subscription
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">Payment received — confirming…</h1>
            <p className="text-muted-foreground mb-8">
              Your payment is being confirmed. Please wait — this can take a minute. The
              subscription activates as soon as Flouci confirms the first charge.
            </p>
            <Link href="/profile">
              <Button variant="outline">Check status on my profile</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
