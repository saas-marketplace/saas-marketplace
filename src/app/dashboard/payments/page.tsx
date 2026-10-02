"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PaymentRow {
  id: string;
  flouci_payment_id: string | null;
  flouci_subscription_id: string | null;
  amount_millimes: number;
  amount_tnd: number;
  currency: string;
  status: string;
  payment_type: string | null;
  billing_reason: string | null;
  settlement_status: string | null;
  amount_verified: boolean;
  created_at: string;
  user?: { email: string; full_name: string | null } | null;
  subscription?: { plan?: { name: string } | null } | null;
}

const statusBadge: Record<string, string> = {
  SUCCESS: "bg-green-600 text-white",
  success: "bg-green-600 text-white",
  PENDING: "bg-amber-500 text-white",
  pending: "bg-amber-500 text-white",
  FAILURE: "bg-red-500 text-white",
  failure: "bg-red-500 text-white",
  EXPIRED: "bg-slate-400 text-white",
  expired: "bg-slate-400 text-white",
  SYSTEM_FAILURE: "bg-red-700 text-white",
};

const reasonLabels: Record<string, string> = {
  subscription_create: "First payment",
  subscription_cycle: "Renewal",
  subscription_retry: "Retry",
};

const fmt = (v: string) => new Date(v).toLocaleString();

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/payments");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRows(data.payments ?? []);
    else setError(data?.error || "Failed to load payments");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">All Flouci charges (first payments, renewals and retries)</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">No payments yet.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-cyan-600 text-white">
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-left py-3 px-4 font-semibold">Plan</th>
                <th className="text-left py-3 px-4 font-semibold">Payment ID</th>
                <th className="text-left py-3 px-4 font-semibold">Subscription ID</th>
                <th className="text-left py-3 px-4 font-semibold">Amount</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-left py-3 px-4 font-semibold">Reason</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Verified</th>
                <th className="text-left py-3 px-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "border-b bg-white" : "border-b bg-slate-50"}>
                  <td className="py-3 px-4 text-black">
                    <p className="font-medium">{p.user?.full_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{p.user?.email}</p>
                  </td>
                  <td className="py-3 px-4 text-black">{p.subscription?.plan?.name ?? "—"}</td>
                  <td className="py-3 px-4 font-mono text-xs text-black break-all">
                    {p.flouci_payment_id ?? "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-black break-all">
                    {p.flouci_subscription_id ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-black">
                    {p.amount_tnd} {p.currency}
                    <span className="text-xs text-slate-500 block">{p.amount_millimes} millimes</span>
                  </td>
                  <td className="py-3 px-4 text-black capitalize">{p.payment_type ?? "—"}</td>
                  <td className="py-3 px-4 text-black">
                    {p.billing_reason ? (reasonLabels[p.billing_reason] ?? p.billing_reason) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={statusBadge[p.status] ?? "bg-slate-400 text-white"}>
                      {p.status}
                    </Badge>
                    {p.settlement_status && (
                      <span className="text-xs text-slate-500 block">settlement: {p.settlement_status}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {p.amount_verified ? (
                      <Badge className="bg-green-600 text-white">Yes</Badge>
                    ) : (
                      <Badge className="bg-amber-500 text-white">No</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-black">{fmt(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
