"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Search,
  Bell,
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Camera,
  Loader2,
  Check,
  Trash2,
  MessageSquare,
  AlertTriangle,
  Users,
  FileText,
  Package,
  Star,
  ChevronRight,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EditProfileModal from '@/components/dashboard/EditProfileModal';

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

// Notification type metadata for grouping and display
interface NotificationTypeConfig {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// Notification type configurations
const NOTIFICATION_TYPES: Record<string, NotificationTypeConfig> = {
  request: { type: 'request', label: 'Requests', icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-500 bg-blue-50' },
  message: { type: 'message', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, color: 'text-green-500 bg-green-50' },
  review: { type: 'review', label: 'Reviews', icon: <Star className="w-4 h-4" />, color: 'text-yellow-500 bg-yellow-50' },
  team: { type: 'team', label: 'Team', icon: <Users className="w-4 h-4" />, color: 'text-purple-500 bg-purple-50' },
  order: { type: 'order', label: 'Orders', icon: <Package className="w-4 h-4" />, color: 'text-cyan-500 bg-cyan-50' },
  new_request: { type: 'new_request', label: 'New Requests', icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-500 bg-blue-50' },
  new_message: { type: 'new_message', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, color: 'text-green-500 bg-green-50' },
  team_activity: { type: 'team_activity', label: 'Team Activity', icon: <Users className="w-4 h-4" />, color: 'text-purple-500 bg-purple-50' },
  system_alert: { type: 'system_alert', label: 'System Alerts', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-500 bg-amber-50' },
  blog_comment: { type: 'blog_comment', label: 'Blog Comments', icon: <FileText className="w-4 h-4" />, color: 'text-pink-500 bg-pink-50' },
  product_update: { type: 'product_update', label: 'Product Updates', icon: <Package className="w-4 h-4" />, color: 'text-cyan-500 bg-cyan-50' },
};

// Format notification time - standalone function for use in components
const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Get notification type config - standalone function for use in components
const getNotificationTypeConfigStandalone = (type: string): NotificationTypeConfig => {
  const config = NOTIFICATION_TYPES[type];
  if (config) {
    return config;
  }
  return { type: 'default', label: 'Other', icon: <Bell className="w-4 h-4" />, color: 'text-gray-500 bg-gray-50' };
};

// Cache keys
const NOTIFICATIONS_CACHE_KEY = 'notifications_cache';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_requested';

// Browser native notification helper
const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  // Check if already requested before
  const hasRequestedBefore = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
  if (hasRequestedBefore) {
    return Notification.permission === 'granted';
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
  
  return false;
};

// Show browser native notification
const showBrowserNotification = (notification: Notification): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  
  if (Notification.permission === 'granted') {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id, // Prevent duplicates
      requireInteraction: false,
    });
    
    browserNotification.onclick = () => {
      window.focus();
      if (notification.link) {
        window.location.href = notification.link;
      }
      browserNotification.close();
    };
  }
};

// Load cached notifications
const loadCachedNotifications = (): Notification[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error loading cached notifications:', error);
    return null;
  }
};

// Save notifications to cache
const saveNotificationsToCache = (notifications: Notification[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving notifications to cache:', error);
  }
};

// Sound notification types
type SoundType = 'user' | 'request' | 'team' | 'message' | 'review' | 'product_update' | 'order' | 'default';

// Different sounds for different notification types
const playNotificationSound = (type?: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different notification types
    const soundConfig: Record<SoundType, { frequency: number; duration: number }> = {
      user: { frequency: 880, duration: 0.3 },          // High pitch - new user signup
      request: { frequency: 660, duration: 0.25 },      // Medium-high - new request
      team: { frequency: 720, duration: 0.2 },          // Medium - team activity
      message: { frequency: 600, duration: 0.25 },      // Medium-low - new message
      review: { frequency: 780, duration: 0.2 },         // Medium-high - new review
      product_update: { frequency: 540, duration: 0.2 }, // Low-medium - product update
      order: { frequency: 700, duration: 0.3 },         // Medium - order completed
      default: { frequency: 800, duration: 0.2 },        // Default sound
    };
    
    const config = soundConfig[type as SoundType] || soundConfig.default;
    
    oscillator.frequency.value = config.frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

// Notification Item Component
const NotificationItem = ({ notification, onClick }: { notification: Notification; onClick: () => void }) => {
  const typeConfig = getNotificationTypeConfigStandalone(notification.type);
  
  return (
    <div
      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.is_read ? 'bg-cyan-50/50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {typeConfig.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {notification.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatNotificationTime(notification.created_at)}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5"></div>
        )}
      </div>
    </div>
  );
};

export default function Topbar() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const user = authUser;
  const session = null;
  const profileLoading = authLoading;
  const previousUserRef = useRef(user);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle logout redirect when user becomes null after sign out
  useEffect(() => {
    // Check if we were logged in before and now we're not (sign out occurred)
    if (previousUserRef.current && !user && isLoggingOut) {
      window.location.href = '/auth/login';
    }
    // Update the ref for next comparison
    previousUserRef.current = user;
  }, [user, isLoggingOut, router]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const notificationsLoadedRef = useRef(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  // Track notification IDs that have already triggered sound to prevent duplicates
  const playedSoundRef = useRef<Set<string>>(new Set());

  const supabase = createClient();

  // Fetch user profile data using user from session
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', user.id)
        .maybeSingle();

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('display_name, role_label, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      let userRole = userData?.role || 'user';

      const displayName = teamMember?.display_name || userData?.full_name || user.email?.split('@')[0] || 'User';
      const avatarUrl = teamMember?.avatar_url || userData?.avatar_url || null;

      const profileData: UserProfile = {
        id: user.id,
        email: user.email || '',
        full_name: displayName,
        avatar_url: avatarUrl,
        role: userRole,
        role_label: teamMember?.role_label
      };

      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile({
        id: user.id,
        email: user.email || 'Admin',
        full_name: 'Admin',
        avatar_url: null,
        role: 'user',
        role_label: 'User'
      });
    }
  }, [supabase, user]);

  // Fetch notification count
  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  }, [supabase, user]);

  // Fetch notifications - with instant cache loading
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    // Skip if already loaded (unless force refresh)
    if (notificationsLoadedRef.current && !forceRefresh) {
      return;
    }
    
    try {
      // Only show loading if not from cache
      const cachedNotifications = !forceRefresh ? loadCachedNotifications() : null;
      const isFromCache = cachedNotifications && cachedNotifications.length > 0;
      
      if (isFromCache) {
        // INSTANT LOAD: Use cached data immediately
        console.log('[Notifications] Loading from cache:', cachedNotifications.length);
        setNotifications(cachedNotifications);
        setNotificationCount(cachedNotifications.filter((n: Notification) => !n.is_read).length);
        notificationsLoadedRef.current = true;
      }

      // Fetch fresh data in background
      setLoadingNotifications(true);
      console.log('[Notifications] Fetching fresh data for user ID:', user.id);

      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Notifications] Fetch error:', error);
        throw error;
      }

      console.log('[Notifications] Fetched notifications:', notificationsData?.length || 0);

      // Update state and cache
      const freshNotifications = notificationsData || [];
      setNotifications(freshNotifications);
      setNotificationCount(freshNotifications.filter((n: Notification) => !n.is_read).length);
      saveNotificationsToCache(freshNotifications);
      notificationsLoadedRef.current = true;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If fetch fails but we have cached data, keep using it
      const cachedNotifications = loadCachedNotifications();
      if (cachedNotifications && cachedNotifications.length > 0) {
        setNotifications(cachedNotifications);
        setNotificationCount(cachedNotifications.filter((n: Notification) => !n.is_read).length);
        notificationsLoadedRef.current = true;
      }
    } finally {
      setLoadingNotifications(false);
    }
  }, [supabase, user]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotificationCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setNotificationCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Compute grouped notifications (uses standalone getNotificationTypeConfigStandalone)
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, { notifications: Notification[]; unreadCount: number }> = {};
    
    notifications.forEach(notification => {
      const typeConfig = getNotificationTypeConfigStandalone(notification.type);
      const groupKey = typeConfig.type;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          notifications: [],
          unreadCount: 0
        };
      }
      
      groups[groupKey].notifications.push(notification);
      if (!notification.is_read) {
        groups[groupKey].unreadCount++;
      }
    });
    
    return groups;
  }, [notifications]);

  // Compute unread count per type
  const unreadByType = useMemo(() => {
    const counts: Record<string, number> = {};
    
    notifications.forEach(notification => {
      const typeConfig = getNotificationTypeConfigStandalone(notification.type);
      const groupKey = typeConfig.type;
      
      if (!notification.is_read) {
        counts[groupKey] = (counts[groupKey] || 0) + 1;
      }
    });
    
    return counts;
  }, [notifications]);

  // Filter notifications by type
  const filteredNotifications = useMemo(() => {
    if (!activeFilter) {
      return notifications;
    }
    return notifications.filter(n => getNotificationTypeConfigStandalone(n.type).type === activeFilter);
  }, [notifications, activeFilter]);

  // Toggle group expansion
  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Clear filter
  const clearFilter = () => {
    setActiveFilter(null);
  };

  // Handle notification click - navigate to link and mark as read
  const handleNotificationClick = async (notification: Notification) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setNotificationCount(prev => Math.max(0, prev - 1));

      if (notification.link) {
        router.push(notification.link);
        setIsNotificationsOpen(false);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Format notification time
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  useEffect(() => {
    // Only fetch when user is available
    if (!user) return;
    
    fetchProfile();
    fetchNotificationCount();
    // Load with cache (instant load)
    fetchNotifications(false);

    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [user, fetchProfile, fetchNotificationCount, fetchNotifications]);

  // Sync cache when notifications change (for manual updates)
  useEffect(() => {
    if (notifications.length > 0) {
      saveNotificationsToCache(notifications);
    }
  }, [notifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time notifications subscription
  useEffect(() => {
    let channel: any = null;
    let isMounted = true;

    const setupRealtimeSubscription = async () => {
      try {
        if (!user || !isMounted) return;

        channel = supabase
          .channel('dashboard-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload: any) => {
              const newNotification = payload.new as Notification;
              
              // Only play sound once per notification (no duplicates)
              if (!playedSoundRef.current.has(newNotification.id)) {
                playedSoundRef.current.add(newNotification.id);
                playNotificationSound(newNotification.type);
              }
              
              // Update state with cache sync
              setNotifications(prev => {
                const updated = [newNotification, ...prev];
                saveNotificationsToCache(updated);
                return updated;
              });
              setNotificationCount(prev => prev + 1);
              
              // Show browser native notification
              showBrowserNotification(newNotification);
              
              console.log('[Notifications] New notification received:', newNotification.type, newNotification.id);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload: any) => {
              setNotifications(prev => {
                const updated = prev.map(n => n.id === payload.new.id ? payload.new as Notification : n);
                saveNotificationsToCache(updated);
                return updated;
              });
              if (payload.new.is_read && !payload.old.is_read) {
                setNotificationCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload: any) => {
              setNotifications(prev => {
                const updated = prev.filter(n => n.id !== payload.old.id);
                saveNotificationsToCache(updated);
                return updated;
              });
              if (!payload.old.is_read) {
                setNotificationCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      isMounted = false;
      if (channel && typeof channel.unsubscribe === 'function') {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error cleaning up subscription:', error);
        }
      }
    };
  }, [supabase, user]);

  const { signOut } = useAuth();

 const handleLogout = async () => {
  if (isLoggingOut) return;
  setIsLoggingOut(true);

  // Instant UI reset
  setProfile(null);
  setNotifications([]);
  setNotificationCount(0);
  setIsProfileOpen(false);
  setIsNotificationsOpen(false);

  try {
    // Use signOut from useAuth to properly trigger auth state changes
    await signOut();
  } catch (err) {
    console.error(err);
  }

  // Clean only auth-related storage
  localStorage.removeItem('supabase.auth.token');
  sessionStorage.clear();

  // Force a hard redirect to ensure clean state
  window.location.href = '/auth/login';
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (profileLoading) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="animate-pulse bg-gray-200 h-10 w-64 rounded-lg"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="animate-pulse bg-gray-200 h-10 w-10 rounded-full"></div>
        </div>
      </div>
    );
  }

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
  const userRole = profile?.role_label || profile?.role || 'User';
  const userInitials = getInitials(userName);
  const userEmail = profile?.email || '';
  const userAvatarUrl = profile?.avatar_url || null;
  
  // Check if user is super admin
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role_label === 'Super Admin';

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center shadow-sm relative z-50">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Search Bar - Desktop */}
      <div
        ref={searchRef}
        className={cn(
          "hidden md:block relative transition-all duration-300",
          isSearchOpen ? "w-full md:w-96" : "w-64"
        )}
      >
        <form onSubmit={handleSearch}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
            aria-label="Search"
          />
        </form>
      </div>

      {/* Mobile Search Toggle */}
      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Mobile Search Input */}
      {isSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-4 md:hidden shadow-lg animate-in slide-in-from-top-2">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus
                aria-label="Search mobile"
              />
            </div>
          </form>
        </div>
      )}

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notification Button & Dropdown */}
        <div ref={notificationsRef} className="relative">
          {/* Notifications Bell - Super Admin Only */}
          {isSuperAdmin && (
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 relative"
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          )}

          {/* Notifications Dropdown - With Grouped Notifications & Unread Badges */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 z-50 max-h-[500px] flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notificationCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs - Unread Badges Per Type */}
              {Object.keys(groupedNotifications).length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                  <button
                    onClick={clearFilter}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5",
                      !activeFilter ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    All
                    {notificationCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                  {Object.entries(groupedNotifications).map(([groupKey, group]) => {
                    const typeConfig = getNotificationTypeConfigStandalone(groupKey);
                    return (
                      <button
                        key={groupKey}
                        onClick={() => setActiveFilter(groupKey)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5",
                          activeFilter === groupKey ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {typeConfig.label}
                        {group.unreadCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                            {group.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Notification List - Grouped or Flat */}
              <div className="flex-1 overflow-y-auto">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                ) : (
                  // Show grouped view if no filter active and more than one group
                  !activeFilter && Object.keys(groupedNotifications).length > 1 ? (
                    <div>
                      {Object.entries(groupedNotifications).map(([groupKey, group]) => {
                        const typeConfig = getNotificationTypeConfigStandalone(groupKey);
                        const isExpanded = expandedGroups.has(groupKey);
                        const displayCount = isExpanded ? group.notifications.length : 1;
                        
                        return (
                          <div key={groupKey} className="border-b border-gray-50">
                            {/* Group Header */}
                            <button
                              onClick={() => toggleGroupExpansion(groupKey)}
                              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn("p-1.5 rounded-lg", typeConfig.color)}>
                                  {typeConfig.icon}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {typeConfig.label}
                                </span>
                                {group.unreadCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded-full">
                                    {group.unreadCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <span className="text-xs">
                                  {group.notifications.length} {group.notifications.length === 1 ? 'notification' : 'notifications'}
                                </span>
                                <ChevronRight className={cn(
                                  "w-4 h-4 transition-transform",
                                  isExpanded && "rotate-90"
                                )} />
                              </div>
                            </button>
                            
                            {/* Group Notifications */}
                            {isExpanded && (
                              <div>
                                {group.notifications.slice(0, 5).map((notification) => (
                                  <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onClick={() => handleNotificationClick(notification)}
                                  />
                                ))}
                                {group.notifications.length > 5 && (
                                  <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                                    +{group.notifications.length - 5} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Flat list view
                    filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))
                  )
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      router.push('/dashboard/settings/notifications');
                    }}
                    className="w-full text-center text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Avatar & Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
            }}
            className={cn(
              "flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200",
              isProfileOpen ? "bg-cyan-50 ring-2 ring-cyan-500/20" : "hover:bg-gray-100"
            )}
            aria-label="Profile menu"
            aria-expanded={isProfileOpen}
          >
            {userAvatarUrl ? (
              <Image
                src={userAvatarUrl}
                alt={userName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-medium shadow-sm">
                {userInitials}
              </div>
            )}
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
                {userName}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {userRole}
              </span>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200 hidden md:block",
              isProfileOpen && "rotate-180"
            )} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userEmail || 'No email'}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 mt-2 capitalize">
                  {userRole}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsEditProfileOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 text-gray-400" />
                Edit Profile
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-full w-64 bg-white shadow-lg p-4 animate-in slide-in-from-right">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push('/dashboard/profile');
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsNotificationsOpen(true);
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                Notifications
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditProfileOpen(false)}
          onUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
            setIsEditProfileOpen(false);
          }}
        />
      )}

      {/* 🔥 Fullscreen logout loader */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Logging out...</span>
          </div>
        </div>
      )}
    </div>
  );
}