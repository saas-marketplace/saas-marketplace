"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
export interface PlanDraft {
  id: string;
  name: string;
  price: string;
  billingPeriod: string;
  description: string;
  isActive: boolean;
}

const emptyPlan = (): PlanDraft => ({
  id: `plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  name: '',
  price: '',
  billingPeriod: 'monthly',
  description: '',
  isActive: true,
});

/**
 * Inline editor for a subscription product's plans.
 * These plans describe pricing shown to customers; recurring billing itself is
 * executed through Flouci subscriptions created server-side.
 */
export default function SubscriptionPlansEditor({
  plans,
  onChange,
}: {
  plans: PlanDraft[];
  onChange: (plans: PlanDraft[]) => void;
}) {
  const update = (id: string, patch: Partial<PlanDraft>) => {
    onChange(plans.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const remove = (id: string) => {
    onChange(plans.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">Subscription plans</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...plans, emptyPlan()])}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add plan
        </Button>
      </div>

      {plans.length === 0 && (
        <p className="text-xs text-slate-500">
          No plans yet. A subscription product needs at least one plan.
        </p>
      )}

      {plans.map((plan) => (
        <div key={plan.id} className="border border-slate-700 rounded-lg p-3 space-y-2 bg-slate-900/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="Plan name"
              value={plan.name}
              onChange={(e) => update(plan.id, { name: e.target.value })}
            />
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="0.001"
                placeholder="Price"
                value={plan.price}
                onChange={(e) => update(plan.id, { price: e.target.value })}
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                TND
              </span>
            </div>
            <Select
              value={plan.billingPeriod}
              onValueChange={(v) => update(plan.id, { billingPeriod: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Billing period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Plan description (optional)"
            rows={2}
            value={plan.description}
            onChange={(e) => update(plan.id, { description: e.target.value })}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={plan.isActive}
                onChange={(e) => update(plan.id, { isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
              />
              Active
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(plan.id)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
