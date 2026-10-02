"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Smartphone, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface D17PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  /**
   * Units being paid for. The cart passes item.quantity; the product page and
   * marketplace card leave it at 1. The backend re-reads the unit price and
   * multiplies by this, so the amount is never trusted from the browser.
   */
  quantity?: number;
}

/**
 * Manual D17 payment modal.
 *
 * The displayed amount is the database unit price × quantity. The BACKEND
 * re-reads the unit price from the database and multiplies by the submitted
 * quantity, so whatever the browser shows/sends can never change the amount.
 *
 * Flow: instructions → sender phone + email → Accept → "Payment submitted —
 * pending verification". Nothing is delivered until an admin confirms.
 */
export default function D17PaymentModal({
  open,
  onOpenChange,
  product,
  quantity = 1,
}: D17PaymentModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [receivingNumber, setReceivingNumber] = useState("+216 28163762");
  const [senderNumber, setSenderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const units = Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1;

  // The amount is the effective (sale) unit price × units — the backend
  // enforces the same calculation again.
  const unitPrice = Number(product.sale_price ?? product.price) || 0;
  const amount = unitPrice * units;

  // Load the receiving number from the server (never hardcoded here) and
  // pre-fill the authenticated user's email.
  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitted(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/d17/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.receivingNumber) setReceivingNumber(data.receivingNumber);
        }
      } catch {
        /* keep default */
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
    })();
  }, [open, supabase]);

  const requireLogin = () => {
    onOpenChange(false);
    router.push(`/auth/login?returnUrl=${encodeURIComponent(`/marketplace/${product.slug || product.id}`)}`);
  };

  const handleAccept = async () => {
    setError(null);

    // Client-side pre-checks (the server re-validates everything).
    if (!senderNumber.trim()) {
      setError("Please enter your D17 phone number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/d17/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          d17SenderNumber: senderNumber,
          customerEmail: email,
          quantity: units,
        }),
      });

      if (res.status === 401) {
        requireLogin();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit the payment. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Payment submitted
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Your D17 payment has been submitted successfully.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-200">
              <p>We will verify your payment manually.</p>
              <p>
                Once the payment is confirmed, you will receive your product. Please make sure
                you sent the exact amount shown above.
              </p>
              <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                <p className="font-medium text-amber-400">⏳ Payment verification pending</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full gradient-bg text-white border-0 hover:opacity-90"
                onClick={() => onOpenChange(false)}
              >
                OK
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Pay with D17</DialogTitle>
              <DialogDescription className="text-slate-300">
                Manual payment — checked by our team after you send the money.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm text-slate-200">
              {/* Instructions with the automatic amount */}
              <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4 space-y-2">
                <p>
                  1. Send exactly{" "}
                  <span className="font-bold text-primary">{formatPrice(amount)}</span> to the
                  following D17 number:
                </p>
                {units > 1 && (
                  <p className="text-xs text-slate-400">
                    {units} × {formatPrice(unitPrice)}
                  </p>
                )}
                <p className="flex items-center gap-2 text-base">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="font-bold tracking-wide text-white">{receivingNumber}</span>
                </p>
                <p className="text-xs text-slate-400">
                  2. Then enter the phone number you used for the D17 payment and your email
                  address below.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="d17-amount">Amount to send</Label>
                <Input
                  id="d17-amount"
                  value={formatPrice(amount)}
                  readOnly
                  disabled
                  className="bg-slate-800/60 border-slate-700 text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="d17-sender">D17 Phone Number</Label>
                <Input
                  id="d17-sender"
                  type="tel"
                  placeholder="Enter your D17 phone number"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  maxLength={16}
                  className="bg-slate-800/60 border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="d17-email">Email</Label>
                <Input
                  id="d17-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/60 border-slate-700"
                />
              </div>

              <p className="flex items-start gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                After submitting, your payment will be manually checked by our team. Your product
                will only be delivered after the payment has been confirmed.
              </p>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-700"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-bg text-white border-0 hover:opacity-90"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Accept"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
