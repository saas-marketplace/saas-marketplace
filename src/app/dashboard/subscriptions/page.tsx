"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  price_tnd: number;
  amount_millimes: number;
  currency: string;
  interval: string;
  interval_count: number;
  flouci_subscription_id: string | null;
  developer_tracking_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  plan?: { name: string } | null;
  user?: { email: string; full_name: string | null } | null;
}

const statusBadge: Record<string, string> = {
  active: "bg-green-600 text-white",
  incomplete: "bg-amber-500 text-white",
  incomplete_expired: "bg-slate-400 text-white",
  past_due: "bg-amber-600 text-white",
  unpaid: "bg-red-500 text-white",
  canceled: "bg-slate-500 text-white",
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/subscriptions");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRows(data.subscriptions ?? []);
    else setError(data?.error || "Failed to load subscriptions");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">All recurring Flouci subscriptions</p>
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
        <p className="text-muted-foreground py-12 text-center">No subscriptions yet.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-cyan-600 text-white">
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-left py-3 px-4 font-semibold">Plan</th>
                <th className="text-left py-3 px-4 font-semibold">Flouci subscription ID</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Price</th>
                <th className="text-left py-3 px-4 font-semibold">Current period</th>
                <th className="text-left py-3 px-4 font-semibold">Next charge</th>
                <th className="text-left py-3 px-4 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "border-b bg-white" : "border-b bg-slate-50"}>
                  <td className="py-3 px-4 text-black">
                    <p className="font-medium">{s.user?.full_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{s.user?.email}</p>
                  </td>
                  <td className="py-3 px-4 text-black">{s.plan?.name ?? "—"}</td>
                  <td className="py-3 px-4 font-mono text-xs text-black break-all">
                    {s.flouci_subscription_id ?? "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={statusBadge[s.status] ?? "bg-slate-400 text-white"}>
                      {s.status}
                      {s.cancel_at_period_end && s.status === "active" ? " (ends at period)" : ""}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-black">
                    {s.price_tnd} {s.currency} / {s.interval_count} × {s.interval}
                  </td>
                  <td className="py-3 px-4 text-black">
                    {fmt(s.current_period_start)} → {fmt(s.current_period_end)}
                  </td>
                  <td className="py-3 px-4 text-black">{s.cancel_at_period_end ? "—" : fmt(s.next_charge_at)}</td>
                  <td className="py-3 px-4 text-black">{fmt(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
