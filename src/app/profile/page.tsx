"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, CreditCard, AlertTriangle, XCircle, RefreshCw, User, CheckCircle2, LifeBuoy, Upload, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/types";

const supabase = createClient();

interface SubscriptionView {
  id: string;
  status: string;
  price_tnd: number;
  currency: string;
  interval: string;
  interval_count: number;
  current_period_start: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  cancel_at_period_end: boolean;
  flouci_subscription_id: string | null;
  plan?: { name: string; description: string | null; features: string[] } | null;
}

const statusStyles: Record<string, string> = {
  active: "bg-green-600 text-white",
  incomplete: "bg-amber-500 text-white",
  incomplete_expired: "bg-slate-400 text-white",
  past_due: "bg-amber-600 text-white",
  unpaid: "bg-red-500 text-white",
  canceled: "bg-slate-500 text-white",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  incomplete: "Awaiting first payment",
  incomplete_expired: "Expired",
  past_due: "Payment issue — retry scheduled",
  unpaid: "Unpaid",
  canceled: "Canceled",
};

const intervalLabel = (interval: string, count: number): string => {
  if (count === 1) return interval;
  return `${count} ${interval}s`;
};

interface ApprovedD17Payment {
  id: string;
  product_name: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  delivered_at: string | null;
  verified_at: string | null;
  created_at: string;
}

const fmtDate = (value: string | null): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

// ── Profile edit + approved D17 deliveries ──
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; email: string } | null>(null);
  const [approvedPayments, setApprovedPayments] = useState<ApprovedD17Payment[]>([]);
  const [fullNameInput, setFullNameInput] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/me");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubscription(data.subscription ?? null);
      setPayments(data.payments ?? []);

      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const pData = await profileRes.json();
        setProfile(pData.profile ?? null);
        setFullNameInput(pData.profile?.full_name ?? "");
        // Preserve whatever avatar already exists (OAuth/Google or a previous
        // upload) so the file input only replaces it when a new file is chosen.
        setAvatarPreview(pData.profile?.avatar_url ?? null);
        setApprovedPayments(pData.approvedPayments ?? []);
      }
    } catch {
      setSubscription(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // D17 approval notifications arrive through the navbar bell
  // (components/providers/layout/NotificationBell), which reads the shared
  // `notifications` table. This page renders only the deliveries list.

  // Poll for new approvals every 20 s while the page is open.
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => {
      fetch("/api/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.approvedPayments) setApprovedPayments(d.approvedPayments);
          if (d?.profile) setProfile(d.profile);
        })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [user]);

  const cancel = async (atPeriodEnd: boolean) => {
    if (!confirm(atPeriodEnd ? "Cancel at the end of the current period?" : "Cancel immediately?")) {
      return;
    }
    setCanceling(true);
    setMessage(null);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atPeriodEnd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Cancellation failed.");
        return;
      }
      setMessage(
        data.status === "canceled"
          ? "Your subscription has been canceled."
          : "Your subscription will not renew after the current period.",
      );
      await load();
    } catch {
      setMessage("Could not reach the cancellation service.");
    } finally {
      setCanceling(false);
    }
  };

  // ── Avatar upload ──
  // Uses the same `team-avatars` bucket as the dashboard EditProfileModal, so
  // there is one storage location for profile images. An existing avatar
  // (including a Google/OAuth one) is preserved unless the user picks a new file.
  const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
  const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setProfileMessage("Please choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setProfileMessage("Image is too large. The maximum size is 2 MB.");
      return;
    }

    setUploadingAvatar(true);
    setProfileMessage(null);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setProfileMessage("Please log in to change your avatar.");
        return;
      }

      const path = `avatars/${authUser.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("team-avatars")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("[profile] avatar upload error:", uploadError);
        setProfileMessage("Could not upload the image. Please try again.");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("team-avatars")
        .getPublicUrl(path);

      // Optimistically show it right away; "Save profile" persists it.
      setAvatarPreview(publicUrl);
      setProfileMessage("Image uploaded — click Save profile to keep it.");
    } catch (err) {
      console.error("[profile] avatar upload failed:", err);
      setProfileMessage("Could not upload the image. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullNameInput, avatarUrl: avatarPreview }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileMessage(data?.error || "Failed to update profile.");
        return;
      }
      setProfile(data.profile);
      setProfileMessage("Profile updated.");
    } catch {
      setProfileMessage("Could not reach the profile service.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to view your account</h1>
          <Link href="/auth/login">
            <Button className="gradient-bg text-white border-0 hover:opacity-90">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isTerminal = subscription?.status === "canceled" || subscription?.status === "incomplete_expired";

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-2">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground mb-8">{profile?.email ?? user.email}</p>
        </div>

        {/* ── Current plan ─────────────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription
            </h2>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>

          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg font-bold">{subscription.plan?.name ?? "Plan"}</span>
                <Badge className={statusStyles[subscription.status] ?? "bg-slate-500 text-white"}>
                  {statusLabels[subscription.status] ?? subscription.status}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {subscription.price_tnd} {subscription.currency} /{" "}
                {intervalLabel(subscription.interval, subscription.interval_count)}
              </p>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Current period</p>
                  <p className="font-medium">
                    {fmtDate(subscription.current_period_start)} → {fmtDate(subscription.current_period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next payment</p>
                  <p className="font-medium">
                    {subscription.cancel_at_period_end ? "Not renewing" : fmtDate(subscription.next_charge_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Flouci subscription</p>
                  <p className="font-medium font-mono text-xs break-all">
                    {subscription.flouci_subscription_id ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status detail</p>
                  <p className="font-medium capitalize">{subscription.status.replace("_", " ")}</p>
                </div>
              </div>

              {subscription.status === "past_due" && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Your last renewal failed. Flouci will retry automatically — please make sure
                    your Flouci wallet can cover the charge.
                  </p>
                </div>
              )}

              {subscription.status === "unpaid" && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Payment retries failed and your subscription is unpaid. Renew from the plans
                    page to restore access.
                  </p>
                </div>
              )}

              {(subscription.status === "active" || subscription.status === "past_due") && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => cancel(true)}
                    disabled={canceling || subscription.cancel_at_period_end}
                  >
                    {canceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Cancel at period end
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => cancel(false)}
                    disabled={canceling}
                  >
                    Cancel immediately
                  </Button>
                </div>
              )}

              {subscription.cancel_at_period_end && !isTerminal && (
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  Cancellation scheduled — your plan stays active until{" "}
                  {fmtDate(subscription.current_period_end)}.
                </p>
              )}

              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p className="mb-4">You don&apos;t have an active subscription.</p>
              <Link href="/plans">
                <Button className="gradient-bg text-white border-0 hover:opacity-90">
                  Browse plans
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Profile edit (name + avatar) ─────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile
            </h2>
            <Link href="/contact">
              <Button variant="outline" size="sm">
                <LifeBuoy className="w-4 h-4 mr-1" />
                Contact support
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {profile?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {(profile?.full_name || user.email)[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{profile?.full_name || "Unnamed user"}</p>
              <p className="text-sm text-muted-foreground">{profile?.email ?? user.email}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Full name</label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Avatar</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingAvatar ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
                {avatarPreview && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarPreview}
                    alt="Selected avatar"
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                )}
                <span className="text-xs text-muted-foreground">JPG, PNG or WEBP · max 2 MB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Save profile
            </Button>
            {profileMessage && <p className="text-sm text-muted-foreground">{profileMessage}</p>}
          </div>
        </div>

        {/* ── Approved D17 deliveries ──────────────────────────────────── */}
        {approvedPayments.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-green-500/40">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Approved payments — your files
            </h2>
            <div className="space-y-3">
              {approvedPayments.map((p) => (
                <div key={p.id} className="flex items-start gap-3 rounded-xl border border-green-500/40 bg-green-500/10 p-3">
                  <FileCheck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Approved on {fmtDate(p.delivered_at ?? p.verified_at)} — {p.amount} {p.currency} · your delivery file has been sent to your email by the admin.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Payment history ──────────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Payment history</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{fmtDate(p.created_at)}</td>
                      <td className="py-2 pr-4">
                        {p.amount_tnd} {p.currency}
                      </td>
                      <td className="py-2 pr-4 capitalize">{p.status}</td>
                      <td className="py-2 pr-4">
                        {p.billing_reason?.replace("subscription_", "") ?? "—"}
                      </td>
                      <td className="py-2 font-mono text-xs">{p.flouci_payment_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
