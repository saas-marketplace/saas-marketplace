"use client";

/**
 * NotificationBell
 * ════════════════
 * The site-wide notification bell, shown in the landing-page navbar.
 *
 * This is NOT a second notification system: it reads and writes the same
 * `notifications` table and uses the same Supabase realtime channel as the
 * dashboard Topbar, so every producer (D17 submissions, D17 approvals, orders,
 * requests, messages…) surfaces here automatically with no extra wiring.
 *
 * A newly inserted row plays a short chime exactly once — tracked by row id in
 * a ref, so a page refresh or re-render never replays it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Bell,
  MessageSquare,
  Star,
  Users,
  Package,
  FileText,
  AlertTriangle,
  CreditCard,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  request: { label: "Requests", icon: <MessageSquare className="w-4 h-4" />, color: "text-blue-500 bg-blue-50" },
  message: { label: "Messages", icon: <MessageSquare className="w-4 h-4" />, color: "text-green-500 bg-green-50" },
  new_message: { label: "Messages", icon: <MessageSquare className="w-4 h-4" />, color: "text-green-500 bg-green-50" },
  review: { label: "Reviews", icon: <Star className="w-4 h-4" />, color: "text-yellow-500 bg-yellow-50" },
  team: { label: "Team", icon: <Users className="w-4 h-4" />, color: "text-purple-500 bg-purple-50" },
  team_activity: { label: "Team", icon: <Users className="w-4 h-4" />, color: "text-purple-500 bg-purple-50" },
  order: { label: "Orders", icon: <Package className="w-4 h-4" />, color: "text-cyan-500 bg-cyan-50" },
  product_update: { label: "Products", icon: <Package className="w-4 h-4" />, color: "text-cyan-500 bg-cyan-50" },
  system_alert: { label: "Alerts", icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-500 bg-amber-50" },
  blog_comment: { label: "Comments", icon: <FileText className="w-4 h-4" />, color: "text-pink-500 bg-pink-50" },
  payment: { label: "Payments", icon: <CreditCard className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
  d17_payment: { label: "Payments", icon: <CreditCard className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
  contact: { label: "Contact", icon: <MessageSquare className="w-4 h-4" />, color: "text-blue-500 bg-blue-50" },
  user: { label: "Activity", icon: <Users className="w-4 h-4" />, color: "text-purple-500 bg-purple-50" },
};

const configFor = (type: string) =>
  TYPE_CONFIG[type] ?? { label: "Other", icon: <Bell className="w-4 h-4" />, color: "text-gray-500 bg-gray-50" };

const formatTime = (value: string): string => {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(value).toLocaleDateString();
};

/** Short chime built with the Web Audio API so no audio asset is needed. */
function playChime() {
  try {
    const Ctx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio unavailable — silent fallback */
  }
}

export default function NotificationBell({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Ids whose chime already played this session — a refresh or re-render will
  // not replay, and the same row never chimes twice.
  const playedIdsRef = useRef<Set<string>>(new Set());
  // Baseline of rows that predate this session, so loading the page is silent.
  const primedRef = useRef(false);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      const rows = (data ?? []) as Notification[];
      setItems(rows);

      // First load only records the baseline — no sound for history.
      if (!primedRef.current) {
        primedRef.current = true;
        rows.forEach((n) => playedIdsRef.current.add(n.id));
      }
    } catch {
      /* transient — realtime will fill in */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      primedRef.current = false;
      playedIdsRef.current = new Set();
      return;
    }
    load();
  }, [user, load]);

  // Realtime: the same mechanism the dashboard Topbar uses.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`navbar-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new as Notification;

          if (!playedIdsRef.current.has(n.id)) {
            playedIdsRef.current.add(n.id);
            // Guard the very first insert after mount so a reload mid-flight
            // never double-chimes.
            if (primedRef.current) playChime();
          }

          setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setItems((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setItems((prev) => prev.filter((n) => n.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (n: Notification) => {
    setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, is_read: true } : p)));
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((p) => ({ ...p, is_read: true })));
    if (user) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    }
  };

  const clearAll = async () => {
    setItems([]);
    if (user) await supabase.from("notifications").delete().eq("user_id", user.id);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-2 rounded-full text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[11px] font-medium rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-white/10 z-50 max-h-[460px] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-cyan-600 hover:text-cyan-500 font-medium">
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  aria-label="Clear all notifications"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              items.map((n) => {
                const cfg = configFor(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors",
                      !n.is_read && "bg-cyan-50/50 dark:bg-cyan-500/5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn("p-1.5 rounded-lg shrink-0", cfg.color)}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm text-gray-900 dark:text-white",
                            !n.is_read && "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-cyan-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 shrink-0">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/profile");
                }}
                className="w-full text-center text-sm text-cyan-600 hover:text-cyan-500 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}