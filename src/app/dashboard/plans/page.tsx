"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, ListChecks } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_tnd: number;
  currency: string;
  interval: string;
  interval_count: number;
  features: string[];
  max_cycles: number | null;
  active: boolean;
  display_order: number;
  created_at: string;
}

const emptyForm = {
  id: "",
  name: "",
  description: "",
  price_tnd: "",
  interval: "month",
  interval_count: "1",
  features: "",
  max_cycles: "",
  active: true,
  display_order: "0",
};

export default function AdminPlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/plans");
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price_tnd: String(plan.price_tnd),
      interval: plan.interval,
      interval_count: String(plan.interval_count),
      features: (plan.features ?? []).join("\n"),
      max_cycles: plan.max_cycles != null ? String(plan.max_cycles) : "",
      active: plan.active,
      display_order: String(plan.display_order),
    });
    setError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: form.id || undefined,
        name: form.name,
        description: form.description,
        price_tnd: Number(form.price_tnd),
        currency: "TND",
        interval: form.interval,
        interval_count: Number(form.interval_count),
        features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
        max_cycles: form.max_cycles === "" ? null : Number(form.max_cycles),
        active: form.active,
        display_order: Number(form.display_order) || 0,
      };
      const res = await fetch("/api/admin/plans", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to save plan");
        return;
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: Plan) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    const res = await fetch("/api/admin/plans", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Plans created here appear on the public Plans page and bill through Flouci
            recurring subscriptions.
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit Plan" : "Add New Plan"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Plan name (e.g. Premium)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Price (TND)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="20"
                    value={form.price_tnd}
                    onChange={(e) => setForm({ ...form, price_tnd: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Billing interval</label>
                    <Select
                      value={form.interval}
                      onValueChange={(v) => setForm({ ...form, interval: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Interval count</label>
                    <Input
                      type="number"
                      min="1"
                      value={form.interval_count}
                      onChange={(e) => setForm({ ...form, interval_count: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 flex items-center gap-1">
                    <ListChecks className="w-3 h-3" /> Features (one per line)
                  </label>
                  <Textarea
                    rows={4}
                    placeholder={"Feature 1\nFeature 2\nFeature 3"}
                    value={form.features}
                    onChange={(e) => setForm({ ...form, features: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Max cycles (optional)</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Leave empty for unlimited"
                      value={form.max_cycles}
                      onChange={(e) => setForm({ ...form, max_cycles: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Display order</label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
                  />
                  Active (visible on the Plans page)
                </label>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={save} disabled={saving || !form.name || form.price_tnd === ""}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {form.id ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No subscription plans yet.</p>
          <p className="text-sm">Click "Add Plan" to create your first plan.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-cyan-600 text-white">
                <th className="text-left py-3 px-4 font-semibold">Plan</th>
                <th className="text-left py-3 px-4 font-semibold">Price</th>
                <th className="text-left py-3 px-4 font-semibold">Billing</th>
                <th className="text-left py-3 px-4 font-semibold">Features</th>
                <th className="text-left py-3 px-4 font-semibold">Order</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-right py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan, index) => (
                <tr key={plan.id} className={index % 2 === 0 ? "border-b bg-white" : "border-b bg-slate-50"}>
                  <td className="py-3 px-4">
                    <p className="font-medium text-black">{plan.name}</p>
                    <p className="text-sm text-slate-600 truncate max-w-[220px]">{plan.description}</p>
                  </td>
                  <td className="py-3 px-4 text-black">
                    {plan.price_tnd} {plan.currency}
                  </td>
                  <td className="py-3 px-4 text-black">
                    {plan.interval_count} × {plan.interval}
                    {plan.max_cycles != null && (
                      <span className="text-xs text-slate-500 block">{plan.max_cycles} cycles</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-black">{plan.features?.length ?? 0}</td>
                  <td className="py-3 px-4 text-black">{plan.display_order}</td>
                  <td className="py-3 px-4">
                    <Badge className={plan.active ? "bg-green-600 text-white" : "bg-slate-400 text-white"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEdit(plan)}
                            className="border-cyan-600 text-cyan-700 hover:bg-cyan-600 hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => remove(plan)}
                            className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
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
