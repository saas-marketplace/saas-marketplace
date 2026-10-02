"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Smartphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface D17Submission {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_name: string;
  amount: number;
  quantity?: number;
  currency: string;
  d17_sender_number: string | null;
  d17_receiving_number: string | null;
  customer_email: string | null;
  status: "pending" | "received" | "rejected";
  rejection_reason: string | null;
  order_id: string | null;
  verified_at: string | null;
  verified_by: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  deliverable_sent_at: string | null;
  deliverable_file_name: string | null;
  user?: { email: string; full_name: string | null } | null;
}

const statusBadge: Record<string, string> = {
  pending: "bg-amber-500 text-white",
  received: "bg-green-600 text-white",
  rejected: "bg-red-500 text-white",
};

const fmt = (v: string) => new Date(v).toLocaleString();

export default function AdminD17Page() {
  const [rows, setRows] = useState<D17Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "received" | "rejected">("all");
  const [sendId, setSendId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/d17");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRows(data.submissions ?? []);
    else setError(data?.error || "Failed to load D17 submissions");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "received" | "rejected") => {
    setActionError(null);

    let rejectionReason: string | undefined;
    if (action === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this payment:") ?? undefined;
      if (rejectionReason === undefined) return; // cancelled
    } else if (!window.confirm("Confirm this D17 payment? An order will be created and the customer notified.")) {
      return;
    }

    setActionId(id);
    try {
      const res = await fetch("/api/admin/d17", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, rejectionReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error || "Failed to update the submission.");
        return;
      }
      // Replace the updated row in place.
      if (data.submission) {
        setRows((prev) => prev.map((r) => (r.id === id ? data.submission : r)));
      } else {
        await load();
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const sendFile = async (id: string, file: File) => {
    setSendError(null);
    setSendOk(null);
    setSendId(id);
    try {
      const form = new FormData();
      form.append("id", id);
      form.append("file", file);
      const res = await fetch("/api/admin/d17/send", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data?.error || "Failed to send the file.");
        return;
      }
      setSendOk(`Sent to ${data.sentTo} ✓`);
      await load();
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSendId(null);
    }
  };

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-cyan-500" /> D17 Payments
          </h1>
          <p className="text-muted-foreground">
            Manual D17 payment submissions — verify payments, create orders and notify customers
            {pendingCount > 0 && (
              <span className="ml-2 font-medium text-amber-500">({pendingCount} pending)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {actionError && <p className="text-sm text-red-500">{actionError}</p>}
      {sendError && <p className="text-sm text-red-500">{sendError}</p>}
      {sendOk && <p className="text-sm text-green-600">{sendOk}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">No D17 submissions {filter === "all" ? "yet" : `with status "${filter}"`}.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-cyan-600 text-white">
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-left py-3 px-4 font-semibold">Product</th>
                <th className="text-left py-3 px-4 font-semibold">Amount</th>
                <th className="text-left py-3 px-4 font-semibold">Sender</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Order</th>
                <th className="text-left py-3 px-4 font-semibold">Submitted</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "border-b bg-white" : "border-b bg-slate-50"}>
                  <td className="py-3 px-4 text-black">
                    <p className="font-medium">{p.user?.full_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{p.user?.email ?? "—"}</p>
                  </td>
                  <td className="py-3 px-4 text-black">{p.product_name}</td>
                  <td className="py-3 px-4 text-black font-medium">
                    {p.amount} {p.currency}
                    {(p.quantity ?? 1) > 1 && (
                      <span className="text-xs text-slate-500 block">{p.quantity} units</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-black">{p.d17_sender_number ?? "—"}</td>
                  <td className="py-3 px-4 text-xs text-black">{p.customer_email ?? "—"}</td>
                  <td className="py-3 px-4">
                    <Badge className={statusBadge[p.status] ?? "bg-slate-400 text-white"}>{p.status}</Badge>
                    {p.rejection_reason && (
                      <span className="text-xs text-red-500 block mt-1 max-w-[200px]">{p.rejection_reason}</span>
                    )}
                    {p.verified_at && (
                      <span className="text-xs text-slate-500 block mt-1">verified: {fmt(p.verified_at)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-black break-all">
                    {p.order_id ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-black whitespace-nowrap">{fmt(p.created_at)}</td>
                  <td className="py-3 px-4">
                    {p.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        {actionId === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <>
                            <Button size="sm" onClick={() => act(p.id, "received")}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => act(p.id, "rejected")}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    ) : p.status === "received" ? (
                      p.deliverable_sent_at ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                          </span>
                          <p className="text-[10px] text-slate-500 max-w-[160px] truncate">{p.deliverable_file_name}</p>
                          <label className="text-xs text-blue-600 underline cursor-pointer">
                            Send again
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.rar,.doc,.docx"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) sendFile(p.id, f);
                              }}
                              disabled={sendId === p.id}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-md cursor-pointer">
                          {sendId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Send file
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.rar,.doc,.docx"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) sendFile(p.id, f);
                            }}
                            disabled={sendId === p.id}
                          />
                        </label>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
