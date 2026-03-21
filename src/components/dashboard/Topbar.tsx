"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Settings,
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
  Package
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

export default function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Fetch user profile data - role is now guaranteed to be valid
  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get user data from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', user.id)
        .maybeSingle();

      // Check team_members table for display_name and role_label
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('display_name, role_label, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      // Role is always valid now - default to 'user' only if somehow missing
      let userRole = userData?.role || 'user';
      
      // Use team_members role_label if available
      if (teamMember?.role_label) {
        if (teamMember.role_label === 'Super Admin') {
          userRole = 'super_admin';
        } else if (teamMember.role_label === 'Admin') {
          userRole = 'admin';
        }
      }

      // Get display name - priority: team_member display_name > users full_name > email prefix
      const displayName = teamMember?.display_name || userData?.full_name || user.email?.split('@')[0] || 'User';
      
      // Get avatar - priority: team_members avatar_url > users avatar_url
      const avatarUrl = teamMember?.avatar_url || userData?.avatar_url || null;

      const profileData: UserProfile = {
        id: user.id,
        email: user.email || '',
        full_name: displayName,
        avatar_url: avatarUrl,
        role: userRole,
        role_label: teamMember?.role_label || userRole
      };

      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Set fallback profile
      setProfile({
        id: '',
        email: 'Admin',
        full_name: 'Admin',
        avatar_url: null,
        role: 'user',
        role_label: 'User'
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Fetch notification count
  const fetchNotificationCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [supabase]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's notification settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      const notificationSettings = userSettings?.notification_settings || {};

      // Get notifications
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Filter notifications based on user settings
      const filteredNotifications = (notificationsData || []).filter((notification: Notification) => {
        const settingKey = `${notification.type}_alerts`;
        return notificationSettings[settingKey] !== false;
      });

      setNotifications(filteredNotifications);
      setNotificationCount(filteredNotifications.filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [supabase]);

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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'team_activity':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'blog_comment':
        return <FileText className="w-4 h-4 text-pink-500" />;
      case 'product_update':
        return <Package className="w-4 h-4 text-cyan-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
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
    fetchProfile();
    fetchNotificationCount();
    fetchNotifications();

    // Listen for profile update events from settings page
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [fetchProfile, fetchNotificationCount, fetchNotifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
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
      .filter(n => n.length > 0)  // Filter out empty strings
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';  // Fallback to 'U' if result is empty
  };

  if (isLoading) {
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
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
              setIsSettingsOpen(false);
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

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
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
              
              <div className="max-h-96 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-cyan-50/50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                        if (notification.link) {
                          router.push(notification.link);
                        }
                        setIsNotificationsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
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
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100">
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
              setIsSettingsOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200",
              isProfileOpen ? "bg-cyan-50 ring-2 ring-cyan-500/20" : "hover:bg-gray-100"
            )}
            aria-label="Profile menu"
            aria-expanded={isProfileOpen}
          >
            {userAvatarUrl ? (
              <img 
                src={userAvatarUrl} 
                alt={userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
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
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Settings Icon & Dropdown */}
        <div ref={settingsRef} className="relative">
          <button
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen);
              setIsProfileOpen(false);
            }}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              isSettingsOpen ? "bg-cyan-50 text-cyan-600 ring-2 ring-cyan-500/20" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
            aria-label="Settings menu"
            aria-expanded={isSettingsOpen}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  router.push('/dashboard/profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 text-gray-400" />
                Profile
              </button>
              
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsNotificationsOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-400" />
                Notifications
              </button>
              
              <div className="my-1 border-t border-gray-100"></div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
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
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
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
    </div>
  );
}
