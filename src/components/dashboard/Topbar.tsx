"use client";

/**
 * Topbar.tsx
 * ══════════
 * ✅ Profile data (name, avatar, role) derived from AuthProvider cache.
 * ✅ No fetchProfile() → no extra users / team_members queries on mount.
 * ✅ Notifications remain as-is (user-specific, needed separately).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useTeamMember } from "@/hooks/useAuthQuery";
import EditProfileModal from "@/components/dashboard/EditProfileModal";
import {
  Search, Bell, LogOut, User, ChevronDown, Menu, X,
  Loader2, Check, Trash2, MessageSquare, AlertTriangle,
  Users, FileText, Package, Star, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  role_label?: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationTypeConfig {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const NOTIFICATION_TYPES: Record<string, NotificationTypeConfig> = {
  request:        { type: "request",        label: "Requests",        icon: <MessageSquare className="w-4 h-4" />, color: "text-blue-500 bg-blue-50"   },
  message:        { type: "message",        label: "Messages",        icon: <MessageSquare className="w-4 h-4" />, color: "text-green-500 bg-green-50" },
  review:         { type: "review",         label: "Reviews",         icon: <Star           className="w-4 h-4" />, color: "text-yellow-500 bg-yellow-50"},
  team:           { type: "team",           label: "Team",            icon: <Users          className="w-4 h-4" />, color: "text-purple-500 bg-purple-50"},
  order:          { type: "order",          label: "Orders",          icon: <Package        className="w-4 h-4" />, color: "text-cyan-500 bg-cyan-50"   },
  new_request:    { type: "new_request",    label: "New Requests",    icon: <MessageSquare className="w-4 h-4" />, color: "text-blue-500 bg-blue-50"   },
  new_message:    { type: "new_message",    label: "Messages",        icon: <MessageSquare className="w-4 h-4" />, color: "text-green-500 bg-green-50" },
  team_activity:  { type: "team_activity",  label: "Team Activity",   icon: <Users          className="w-4 h-4" />, color: "text-purple-500 bg-purple-50"},
  system_alert:   { type: "system_alert",   label: "System Alerts",   icon: <AlertTriangle  className="w-4 h-4" />, color: "text-amber-500 bg-amber-50" },
  blog_comment:   { type: "blog_comment",   label: "Blog Comments",   icon: <FileText       className="w-4 h-4" />, color: "text-pink-500 bg-pink-50"   },
  product_update: { type: "product_update", label: "Product Updates", icon: <Package        className="w-4 h-4" />, color: "text-cyan-500 bg-cyan-50"   },
};

const getTypeConfig = (type: string): NotificationTypeConfig =>
  NOTIFICATION_TYPES[type] ?? {
    type: "default", label: "Other",
    icon: <Bell className="w-4 h-4" />, color: "text-gray-500 bg-gray-50",
  };

const formatTime = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(dateString).toLocaleDateString();
};

const NOTIFICATIONS_KEY = "notifications_cache";
const loadCache = (): Notification[] | null => {
  try { return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) ?? "null"); }
  catch { return null; }
};
const saveCache = (n: Notification[]) => {
  try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(n)); } catch {}
};

const supabase = createClient();

// ─── Notification Item ────────────────────────────────────────────────────────

const NotificationItem = ({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) => {
  const cfg = getTypeConfig(notification.type);
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.is_read ? "bg-cyan-50/50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
            {notification.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5" />
        )}
      </div>
    </div>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────

export default function Topbar() {
  const router = useRouter();
  const { user, authData, loading: authLoading, signOut } = useAuth();

  // ✅ Profile data from the shared team_members cache — no extra query
  const { data: teamMember } = useTeamMember(authData);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsLoadedRef = useRef(false);
  const playedSoundRef = useRef<Set<string>>(new Set());

  // ✅ Derive profile from cached data — no fetchProfile() call
  const profile = useMemo<UserProfile | null>(() => {
    if (!user || !authData) return null;
    return {
      id: user.id,
      email: user.email,
      full_name: teamMember?.display_name ?? null,
      avatar_url: teamMember?.avatar_url ?? null,
      role: user.role,
      role_label: teamMember?.role_label ?? null,
    };
  }, [user, authData, teamMember]);

  // State that can be overridden locally (e.g. after profile edit)
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const displayProfile = localProfile ?? profile;

  // Sync localProfile when base profile changes (e.g. after login)
  useEffect(() => {
    setLocalProfile(null); // reset override so we pick up fresh server data
  }, [user?.id]);

  // Listen for profile-updated events (fired by EditProfileModal)
  useEffect(() => {
    const handler = () => setLocalProfile(null);
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  // ── ADMIN PRESENCE: manage is_online across ALL dashboard pages ──
  //
  // Previously, admin online status was managed only inside dashboard/requests/page.tsx.
  // That caused is_online to be set FALSE every time the admin navigated away from
  // that one page (useEffect cleanup), making them appear offline on the user side.
  //
  // The Topbar is mounted for the entire dashboard session, so it's the correct
  // place to maintain admin presence: set online on mount, heartbeat every 30s,
  // and set offline only on real tab-close / logout (not on page navigation).
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return;

    const adminId = user.id;

    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        await supabase.from('user_status').upsert({
          user_id: adminId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('[Topbar Admin Status] Error:', err);
      }
    };

    // Mark online immediately on mount
    updateOnlineStatus(true);

    // Heartbeat every 30s so the DB value stays fresh
    const heartbeat = setInterval(() => updateOnlineStatus(true), 30_000);

    const handleBeforeUnload = () => updateOnlineStatus(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateOnlineStatus(false);
      } else if (document.visibilityState === 'visible') {
        updateOnlineStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Do NOT call updateOnlineStatus(false) here — this cleanup runs whenever
      // the Topbar re-renders due to prop changes, not only on real logout/tab-close.
      // Logout sets offline explicitly in handleLogout below.
    };
  }, [user?.id, user?.role]);

  // Browser notification permission
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setBrowserNotifEnabled(true);
      return;
    }
    if (
      Notification.permission !== "denied" &&
      !localStorage.getItem("notification_permission_requested")
    ) {
      Notification.requestPermission().then((p) => {
        localStorage.setItem("notification_permission_requested", "true");
        setBrowserNotifEnabled(p === "granted");
      });
    }
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────

  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotificationCount(count ?? 0);
  }, [user]);

  const fetchNotifications = useCallback(
    async (forceRefresh = false) => {
      if (!user || (notificationsLoadedRef.current && !forceRefresh)) return;
      const cached = !forceRefresh ? loadCache() : null;
      if (cached?.length) {
        setNotifications(cached);
        setNotificationCount(cached.filter((n) => !n.is_read).length);
        notificationsLoadedRef.current = true;
      }
      setLoadingNotifications(true);
      try {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        const fresh = data ?? [];
        setNotifications(fresh);
        setNotificationCount(fresh.filter((n: Notification) => !n.is_read).length);
        saveCache(fresh);
        notificationsLoadedRef.current = true;
      } catch {}
      finally { setLoadingNotifications(false); }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    fetchNotificationCount();
    fetchNotifications(false);
  }, [user, fetchNotificationCount, fetchNotifications]);

  useEffect(() => {
    if (notifications.length > 0) saveCache(notifications);
  }, [notifications]);

  // Real-time notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new as Notification;
          if (!playedSoundRef.current.has(n.id)) {
            playedSoundRef.current.add(n.id);
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator(); const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 800; osc.type = "sine";
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
            } catch {}
          }
          setNotifications((prev) => { const u = [n, ...prev]; saveCache(u); return u; });
          setNotificationCount((c) => c + 1);
          if (browserNotifEnabled && "Notification" in window && Notification.permission === "granted") {
            new Notification(n.title, { body: n.message, icon: "/favicon.ico", tag: n.id });
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setNotifications((prev) => { const u = prev.map((n) => n.id === payload.new.id ? payload.new : n); saveCache(u); return u; });
          if (payload.new.is_read && !payload.old.is_read) setNotificationCount((c) => Math.max(0, c - 1));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setNotifications((prev) => { const u = prev.filter((n) => n.id !== payload.old.id); saveCache(u); return u; });
          if (!payload.old.is_read) setNotificationCount((c) => Math.max(0, c - 1));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, browserNotifEnabled]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setNotificationCount((c) => Math.max(0, c - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setNotificationCount(0);
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]); setNotificationCount(0);
  };

  const handleNotificationClick = async (n: Notification) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    setNotificationCount((c) => Math.max(0, c - 1));
    if (n.link) { router.push(n.link); setIsNotificationsOpen(false); }
  };

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, { notifications: Notification[]; unreadCount: number }> = {};
    notifications.forEach((n) => {
      const key = getTypeConfig(n.type).type;
      if (!groups[key]) groups[key] = { notifications: [], unreadCount: 0 };
      groups[key].notifications.push(n);
      if (!n.is_read) groups[key].unreadCount++;
    });
    return groups;
  }, [notifications]);

  const filteredNotifications = useMemo(
    () => activeFilter ? notifications.filter((n) => getTypeConfig(n.type).type === activeFilter) : notifications,
    [notifications, activeFilter]
  );

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLocalProfile(null);
    setNotifications([]); setNotificationCount(0);
    setIsProfileOpen(false); setIsNotificationsOpen(false);
    
    // Update admin online status on logout
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      try {
        await supabase.from('user_status').upsert({
          user_id: user.id,
          is_online: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('[Logout] Error updating admin status:', err);
      }
    }
    
    try { signOut(); } catch {}
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
    window.location.href = "/auth/login";
  };

  const getInitials = (name: string) =>
    name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  if (authLoading) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="animate-pulse bg-gray-200 h-10 w-64 rounded-lg" />
        <div className="animate-pulse bg-gray-200 h-10 w-10 rounded-full" />
      </div>
    );
  }

  const userName = displayProfile?.full_name ?? displayProfile?.email?.split("@")[0] ?? "User";
  const userRole = displayProfile?.role_label ?? displayProfile?.role ?? "User";
  const userInitials = getInitials(userName);
  const userEmail = displayProfile?.email ?? "";
  const userAvatarUrl = displayProfile?.avatar_url ?? null;
  const isSuperAdmin = displayProfile?.role === "super_admin";

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center shadow-sm relative z-50">
      {/* Mobile Menu */}
      <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Search */}
      <div ref={searchRef} className={cn("hidden md:block relative transition-all duration-300", isSearchOpen ? "w-full md:w-96" : "w-64")}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </form>
      </div>

      <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Search className="w-5 h-5" /></button>

      {isSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-4 md:hidden shadow-lg">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500" autoFocus />
          </div>
        </div>
      )}

      {/* Right Side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notifications — super admin only */}
        <div ref={notificationsRef} className="relative">
          {isSuperAdmin && (
            <button onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
          )}

          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-[500px] flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notificationCount > 0 && <button onClick={markAllAsRead} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">Mark all read</button>}
                  {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs text-gray-500 hover:text-gray-700">Clear all</button>}
                </div>
              </div>

              {Object.keys(groupedNotifications).length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto shrink-0">
                  <button onClick={() => setActiveFilter(null)} className={cn("px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1.5", !activeFilter ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    All {notificationCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{notificationCount}</span>}
                  </button>
                  {Object.entries(groupedNotifications).map(([key, group]) => {
                    const cfg = getTypeConfig(key);
                    return (
                      <button key={key} onClick={() => setActiveFilter(key)} className={cn("px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1.5", activeFilter === key ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                        {cfg.label} {group.unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{group.unreadCount}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center"><Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No notifications</p></div>
                ) : !activeFilter && Object.keys(groupedNotifications).length > 1 ? (
                  <div>
                    {Object.entries(groupedNotifications).map(([key, group]) => {
                      const cfg = getTypeConfig(key);
                      const isExpanded = expandedGroups.has(key);
                      return (
                        <div key={key} className="border-b border-gray-50">
                          <button onClick={() => setExpandedGroups((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; })}
                            className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <span className={cn("p-1.5 rounded-lg", cfg.color)}>{cfg.icon}</span>
                              <span className="text-sm font-medium text-gray-900">{cfg.label}</span>
                              {group.unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded-full">{group.unreadCount}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <span className="text-xs">{group.notifications.length} notification{group.notifications.length !== 1 ? "s" : ""}</span>
                              <ChevronRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
                            </div>
                          </button>
                          {isExpanded && (
                            <div>
                              {group.notifications.slice(0, 5).map((n) => <NotificationItem key={n.id} notification={n} onClick={() => handleNotificationClick(n)} />)}
                              {group.notifications.length > 5 && <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">+{group.notifications.length - 5} more</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  filteredNotifications.map((n) => <NotificationItem key={n.id} notification={n} onClick={() => handleNotificationClick(n)} />)
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                  <button onClick={() => { setIsNotificationsOpen(false); router.push("/dashboard/settings/notifications"); }}
                    className="w-full text-center text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={cn("flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200", isProfileOpen ? "bg-cyan-50 ring-2 ring-cyan-500/20" : "hover:bg-gray-100")}>
            {userAvatarUrl ? (
              <Image src={userAvatarUrl} alt={userName} width={40} height={40} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-medium shadow-sm">
                {userInitials}
              </div>
            )}
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">{userName}</span>
              <span className="text-xs text-gray-500 capitalize">{userRole}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200 hidden md:block", isProfileOpen && "rotate-180")} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail || "No email"}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 mt-2 capitalize">{userRole}</span>
              </div>
              <button onClick={() => { setIsProfileOpen(false); setIsEditProfileOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="w-4 h-4 text-gray-400" /> Edit Profile
              </button>
              <button onClick={handleLogout} disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <LogOut className="w-4 h-4" /> {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-full w-64 bg-white shadow-lg p-4">
            <button onClick={() => { setIsMobileMenuOpen(false); router.push("/dashboard/profile"); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg w-full">
              <User className="w-4 h-4" /> Profile
            </button>
            <button onClick={() => { setIsMobileMenuOpen(false); setIsNotificationsOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg w-full">
              <Bell className="w-4 h-4" /> Notifications
            </button>
            <button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full">
              <LogOut className="w-4 h-4" /> {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && displayProfile && (
        <EditProfileModal
          profile={displayProfile}
          onClose={() => setIsEditProfileOpen(false)}
          onUpdate={(updated) => { setLocalProfile(updated); setIsEditProfileOpen(false); }}
        />
      )}

      {/* Logout overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-gray-600 font-medium">Logging out...</span>
          </div>
        </div>
      )}
    </div>
  );
}