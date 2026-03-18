"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccessControl } from "@/hooks/useAccessControl";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Send, 
  ArrowLeft,
  Loader2,
  Mail,
  ChevronLeft,
  AlertTriangle,
  Briefcase,
  Globe,
  Eye,
  Star,
  Folder
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FreelancerMiniCard } from "@/components/ui/freelancer-mini-card";

interface Request {
  id: string;
  user_id: string;
  title: string | null;
  status: "pending" | "received" | "answered";
  created_at: string;
  last_message?: string;
  // New fields for freelancer data
  freelancer_id?: string | null;
  freelancer_domain?: string | null;
  freelancer_characteristics?: any | null;
  freelancer_data?: {
    name: string;
    title?: string;
    domain?: string | null;
    domain_id?: string | null;
    skills?: string[] | null;
    experience_level?: string | null;
    description?: string | null;
    rating?: number | null;
    reviews_count?: number | null;
    projects_count?: number | null;
  } | null;
  subject_type?: string | null;
  users?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

interface RequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface TypingStatus {
  [requestId: string]: boolean;
}

interface OnlineStatus {
  [userId: string]: {
    online: boolean;
    lastSeen?: string;
  };
}

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
}

interface FreelancerInfo {
  id: string;
  display_name: string;
  title: string | null;
  domain_id: string | null;
  skills: string[] | null;
  experience_level: string | null;
  description: string | null;
  rating: number | null;
  review_count: number | null;
  completed_projects: number | null;
  domains?: {
    name: string;
  } | null;
}

interface FreelancerData {
  name: string;
  title?: string;
  domain?: string | null;
  domain_id?: string | null;
  skills?: string[] | null;
  experience_level?: string | null;
  description?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  projects_count?: number | null;
}

export default function UserRequestsPage() {
  const { isLoading, canAccessSection, canCreate, permissions } = useAccessControl();
  
  // Debug: Log permissions for requests section
  console.log('[Requests] Permissions:', permissions);
  console.log('[Requests] canCreate(requests):', canCreate('requests'));
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [userInfoMap, setUserInfoMap] = useState<Map<string, UserInfo>>(new Map());
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [freelancerInfoMap, setFreelancerInfoMap] = useState<Map<string, FreelancerInfo>>(new Map());
  const [selectedFreelancer, setSelectedFreelancer] = useState<FreelancerInfo | null>(null);
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});
  const [userIsTyping, setUserIsTyping] = useState(false);
  const [typingChannelRef, setTypingChannelRef] = useState<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Access control check
  if (!isLoading && !canAccessSection('requests')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          You don't have permission to view this section. Contact your administrator for access.
        </p>
      </div>
    );
  }

  // Fetch current user and requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        
        // Check if user is admin or super_admin
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        const isAdminUser = userData?.role === 'admin' || userData?.role === 'super_admin';
        setIsAdmin(isAdminUser);
        
        let query = supabase
          .from("requests")
          .select("*")
          .order("created_at", { ascending: false });
        
        // If admin or super_admin, show all requests; otherwise show only user's requests
        if (!isAdminUser) {
          query = query.eq("user_id", user.id);
        }
        const { data } = await query;
        
        if (data) {
          // Fetch all domains once → build id→name map to resolve domain_id in freelancer_data
          const { data: allDomains } = await supabase.from('domains').select('id, name');
          const domainNameMap = new Map<string, string>();
          allDomains?.forEach(d => domainNameMap.set(d.id, d.name));

          // Inject the resolved domain name into freelancer_data for every request.
          // freelancer_data is a raw JSON column — it only stores domain_id (a UUID),
          // never the human-readable name. We resolve it here so the card can display it.
          const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
          const injectDomain = (r: any) => {
            if (!r.freelancer_data) return r;
            const fd = r.freelancer_data;
            // Already a real name? Keep it. Otherwise resolve from domain_id.
            const existing = typeof fd.domain === 'string' && fd.domain.trim() !== '' && !isUUID(fd.domain)
              ? fd.domain : null;
            const fromCol = typeof r.freelancer_domain === 'string' && r.freelancer_domain.trim() !== '' && !isUUID(r.freelancer_domain)
              ? r.freelancer_domain : null;
            const fromMap = typeof fd.domain_id === 'string' ? (domainNameMap.get(fd.domain_id) ?? null) : null;
            const domainName = existing || fromCol || fromMap || null;
            console.log(`[domain] "${fd.name}" domain_id=${fd.domain_id} → "${domainName}"`);
            return { ...r, freelancer_data: { ...fd, domain: domainName }, freelancer_domain: domainName ?? r.freelancer_domain };
          };

          // If admin or super_admin, fetch user info for each request and get last messages
          if (isAdminUser && data.length > 0) {
            const userIds = Array.from(new Set(data.map(r => r.user_id)));
            const { data: usersData } = await supabase
              .from('users')
              .select('id, email, full_name')
              .in('id', userIds);
            
            // Create user info map
            const map = new Map<string, UserInfo>();
            usersData?.forEach(u => map.set(u.id, u));
            setUserInfoMap(map);
            
            // Fetch freelancer data for requests with freelancer_id
            const freelancerIds = Array.from(new Set(data.filter(r => r.freelancer_id).map(r => r.freelancer_id)));
            if (freelancerIds.length > 0) {
              const { data: freelancersData } = await supabase
                .from('freelancers')
                .select('id, display_name, title, domain_id, skills, experience_level, description, domains(name)')
                .in('id', freelancerIds as string[]);
              
              const freelancerMap = new Map<string, FreelancerInfo>();
              freelancersData?.forEach(f => freelancerMap.set(f.id, f));
              setFreelancerInfoMap(freelancerMap);
            }
            
            // Get last messages for each request (ascending to get oldest first, then take last)
            const { data: lastMessages } = await supabase
              .from('request_messages')
              .select('request_id, message, created_at')
              .order('created_at', { ascending: true });
            
            const lastMsgMap = new Map<string, string>();
            lastMessages?.forEach(m => {
              // Keep overwriting to get the LAST message (since sorted ascending)
              lastMsgMap.set(m.request_id, m.message);
            });
            
            const requestsWithUsers = data
              .map(r => injectDomain(r))
              .map(r => ({
                ...r,
                users: map.get(r.user_id) || null,
                last_message: lastMsgMap.get(r.id) || ''
              }));
            setRequests(requestsWithUsers);
          } else {
            // For regular users, get last messages (ascending to get oldest first, then take last)
            const { data: lastMessages } = await supabase
              .from('request_messages')
              .select('request_id, message, created_at')
              .order('created_at', { ascending: true });
            
            const lastMsgMap = new Map<string, string>();
            lastMessages?.forEach(m => {
              // Keep overwriting to get the LAST message (since sorted ascending)
              lastMsgMap.set(m.request_id, m.message);
            });
            
            const requestsWithLastMsg = data
              .map(r => injectDomain(r))
              .map(r => ({
                ...r,
                last_message: lastMsgMap.get(r.id) || ''
              }));
            setRequests(requestsWithLastMsg);
          }
        }
      }
      setLoading(false);
    };
    fetchRequests();
  }, [supabase]);

  // Update admin status when page loads
  useEffect(() => {
    if (!currentUserId || !isAdmin) return;
    
    const updateAdminStatus = async (isOnline: boolean) => {
      try {
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (error) {
        console.error('[Admin Status] Error updating status:', error);
      }
    };
    
    // Set admin as online on mount
    updateAdminStatus(true);
    
    // Update on user activity
    const handleActivity = () => updateAdminStatus(true);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      updateAdminStatus(false);
    };
  }, [supabase, currentUserId, isAdmin]);

  // Update last_seen on beforeunload (when admin closes tab/browser)
  useEffect(() => {
    if (!currentUserId || !isAdmin) return;
    
    const handleBeforeUnload = async () => {
      await supabase.from('user_status').upsert({
        user_id: currentUserId,
        is_online: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [supabase, currentUserId, isAdmin]);

  // Fetch messages when a request is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedRequest) return;
      
      setMessagesLoading(true);
      try {
        const response = await fetch(`/api/requests/messages?request_id=${selectedRequest.id}`);
        const data = await response.json();
        
        if (data.messages) {
          // Ensure messages are sorted by created_at ascending (oldest first)
          const sortedMessages = [...data.messages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(sortedMessages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchMessages();
  }, [selectedRequest?.id]);

  // Real-time subscription for messages (to receive user messages instantly)
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const messageChannel = supabase
      .channel('admin_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_messages',
          filter: `request_id=eq.${selectedRequest.id}`
        },
        (payload) => {
          const newMessage = payload.new as RequestMessage;
          // Avoid duplicate messages
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            const newMessages = [...prev, newMessage];
            return newMessages.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedRequest?.id, supabase]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Scroll to bottom on messages change (after they're loaded)
  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, messagesLoading, scrollToBottom]);

  // Online status and typing subscription
  useEffect(() => {
    if (!selectedRequest?.user_id) {
      console.log('[Admin Presence] No user_id in selectedRequest, skipping');
      return;
    }
    
    console.log('[Admin Presence] Subscribing for user:', selectedRequest.user_id);
    
    // First, try to fetch existing status
    const fetchInitialStatus = async () => {
      console.log('[Admin Presence] Fetching initial status for:', selectedRequest.user_id);
      const { data, error } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_id', selectedRequest.user_id)
        .maybeSingle();
      
      if (error) {
        console.log('[Admin Presence] Error fetching status:', error);
      } else if (data) {
        console.log('[Admin Presence] Initial status data:', data);
        setOnlineStatus(prev => ({
          ...prev,
          [data.user_id]: {
            online: data.is_online,
            lastSeen: data.last_seen
          }
        }));
      } else {
        console.log('[Admin Presence] No status found for user (they may not have visited the requests page yet)');
      }
    };
    
    fetchInitialStatus();
    
    // Subscribe to user_status table for online status
    const statusChannel = supabase
      .channel('admin_user_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=eq.${selectedRequest.user_id}`
        },
        (payload) => {
          console.log('[Admin Presence] Status change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const statusData = payload.new as { user_id: string; is_online: boolean; last_seen: string };
            console.log('[Admin Presence] Setting status:', statusData);
            setOnlineStatus(prev => ({
              ...prev,
              [statusData.user_id]: {
                online: statusData.is_online,
                lastSeen: statusData.last_seen
              }
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to typing via broadcast (faster than database)
    const typingChannel = supabase
      .channel('typing_broadcast')
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          const { requestId, userId, isTyping } = payload.payload;
          // Only show typing if it's for the current request and not from self (admin)
          if (requestId === selectedRequest.id && userId !== currentUserId) {
            console.log('[Admin Presence] User typing via broadcast:', isTyping);
            setUserIsTyping(isTyping);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Admin Presence] Cleaning up subscriptions');
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [supabase, selectedRequest?.id, selectedRequest?.user_id, currentUserId]);

  // Send typing status via broadcast
  const sendTypingStatus = async (isTyping: boolean) => {
    if (!selectedRequest?.id || !currentUserId) return;
    
    console.log('[Typing] Sending:', { requestId: selectedRequest.id, userId: currentUserId, isTyping });
    
    // Create channel if not exists and subscribe
    if (!typingChannelRef.current) {
      const channel = supabase.channel('typing_broadcast');
      await channel.subscribe();
      setTypingChannelRef(channel);
    }
    
    // Send broadcast typing event
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { 
        requestId: selectedRequest.id, 
        userId: currentUserId, 
        isTyping 
      }
    });
  };

  // Handle typing input
  const handleTyping = () => {
    sendTypingStatus(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;
    
    // Check permission - users need create permission on requests to send messages
    if (!canCreate('requests')) {
      alert('You do not have permission to send messages');
      return;
    }
    
    setSendingMessage(true);
    try {
      const response = await fetch("/api/requests/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          message: newMessage.trim(),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Add new message to the list (already sorted by API)
        setMessages(prev => {
          const newMessages = [...prev, data.message];
          return newMessages.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        setNewMessage("");
        
        // Update request status locally
        const newStatus = isAdmin ? "answered" : "received";
        setRequests(prev => 
          prev.map(r => 
            r.id === selectedRequest.id 
              ? { ...r, status: newStatus as Request["status"], last_message: newMessage.trim() }
              : r
          )
        );
        setSelectedRequest(prev => 
          prev ? { ...prev, status: newStatus as Request["status"], last_message: newMessage.trim() } : null
        );
        
        // Scroll to bottom after sending
        setTimeout(scrollToBottom, 150);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle selecting a request
  const handleSelectRequest = (request: Request) => {
    setSelectedRequest(request);
    setIsMobileChatOpen(true);
  };

  // Handle closing mobile chat
  const handleCloseMobileChat = () => {
    setIsMobileChatOpen(false);
    setSelectedRequest(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "received":
        return <CheckCircle className="w-4 h-4 text-[#249fd3]" />;
      case "answered":
        return <XCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      case "received":
        return <Badge variant="secondary" className="bg-[#249fd3]/10 text-[#249fd3]">Received</Badge>;
      case "answered":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Answered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get display name - shows actual user info
  const getRequestDisplayName = (request: Request) => {
    if (isAdmin) {
      const userInfo = request.users || userInfoMap.get(request.user_id);
      return userInfo?.full_name || userInfo?.email || "Unknown User";
    } else {
      // For regular users, show "Admin" or fetch admin name
      return "Admin";
    }
  };

  // Get user email for admin view
  const getUserEmail = (request: Request) => {
    if (isAdmin) {
      const userInfo = request.users || userInfoMap.get(request.user_id);
      return userInfo?.email;
    }
    return null;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get preview message - returns shortened latest message
  const getPreviewMessage = (messages: { message: string; created_at: string }[]): string => {
    if (!messages || messages.length === 0) {
      return "No messages yet";
    }
    // Sort by created_at descending to get latest message first
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestMessage = sortedMessages[0]?.message || "No messages yet";
    // Shorten to max 60 characters
    if (latestMessage.length > 60) {
      return latestMessage.substring(0, 60) + "...";
    }
    return latestMessage;
  };

  // Truncate message for preview (max 60 characters)
  const truncateMessage = (message: string | undefined | null): string => {
    if (!message) return "No messages yet";
    if (message.length > 60) {
      return message.substring(0, 60) + "...";
    }
    return message;
  };

  // Check if message is from current user
  const isCurrentUserMessage = (senderId: string): boolean => {
    return currentUserId === senderId;
  };

  // Handle viewing freelancer profile
  const handleViewFreelancer = (freelancerId: string) => {
    window.open(`/freelancers/profile/${freelancerId}`, '_blank');
  };

  // Format last seen time - shows exact time in HH:MM AM/PM format
  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get user status (for admin view)
  const getUserStatus = () => {
    if (!selectedRequest?.user_id) return null;
    
    console.log('[Admin UI] Getting status for user:', selectedRequest.user_id, 'Status:', onlineStatus[selectedRequest.user_id]);
    
    // Check if user is typing
    if (typingStatus[selectedRequest.id]) {
      return (
        <span className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          typing
        </span>
      );
    }
    
    const userStatus = onlineStatus[selectedRequest.user_id];
    console.log('[Admin UI] User status object:', userStatus);
    
    if (userStatus?.online) {
      return <span className="text-xs text-green-500 dark:text-green-400">Online</span>;
    }
    
    if (userStatus?.lastSeen) {
      return <span className="text-xs text-slate-500 dark:text-slate-400">{formatLastSeen(userStatus.lastSeen)}</span>;
    }
    
    // If no status data at all, show nothing or a default message
    return <span className="text-xs text-slate-400">Offline</span>;
  };

  // Get sender display name
  const getSenderDisplayName = (senderId: string, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return isAdmin ? "Admin" : "You";
    } else {
      // Check if sender is the request owner
      if (selectedRequest && senderId === selectedRequest.user_id) {
        return isAdmin ? "User" : "You";
      } else if (isAdmin) {
        return "Admin";
      } else {
        return "Admin";
      }
    }
  };

  // ==================== CHAT VIEW ====================
  if (selectedRequest) {
    return (
      <>
        {/* Mobile Chat View - Full Screen */}
        <div className={`fixed inset-0 z-50 bg-white lg:hidden ${isMobileChatOpen ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col bg-white rounded-t-2xl overflow-hidden">
            {/* Mobile Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-100 bg-gradient-to-l from-white via-cyan-50 to-cyan-100 rounded-t-2xl shrink-0">
              <button 
                onClick={handleCloseMobileChat}
                className="p-2 -ml-2 text-slate-700 hover:text-[#249fd3] hover:bg-cyan-50 rounded-full transition-all duration-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shrink-0 shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate text-slate-900">
                  {getRequestDisplayName(selectedRequest)}
                </h2>
                <p className="text-xs text-slate-500">
                  {isAdmin && selectedRequest.user_id ? getUserStatus() : formatDate(selectedRequest.created_at)}
                </p>
              </div>
              {getStatusBadge(selectedRequest.status)}
            </div>

            {/* Mobile Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 p-3 sm:p-4 pb-24 bg-white"
            >
              {/* Subject - inside scroll container */}
              {selectedRequest.title && (
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 shrink-0">
                  <p className="font-medium text-sm text-slate-800">{selectedRequest.title}</p>
                </div>
              )}
              
              {/* Freelancer Mini Card - inside scroll container */}
              {selectedRequest.freelancer_data && (
                <div className="shrink-0">
                  <FreelancerMiniCard 
                    freelancer={selectedRequest.freelancer_data} 
                    fallbackDomain={selectedRequest.freelancer_domain}
                    compact
                    showExpand={true}
                    dashboardMode={true}
                    onViewProfile={() => {
                      if (selectedRequest.freelancer_id) {
                        handleViewFreelancer(selectedRequest.freelancer_id);
                      }
                    }}
                  />
                </div>
              )}
              
              {/* Messages */}
              
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg, index) => {
                    const isUserMsg = isCurrentUserMessage(msg.sender_id);
                    const showAvatar = !isUserMsg;
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`flex ${isUserMsg ? "justify-end" : "justify-start"} items-end`}
                      >
                        {/* Avatar for receiver */}
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center mr-2 shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        {/* Message bubble - Modern chat style */}
                        <div 
                          className={`max-w-[70%] sm:max-w-[70%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                            isUserMsg
                              ? "bg-gradient-to-br from-[#249fd3] to-cyan-500 text-white rounded-br-sm shadow-md shadow-cyan-500/20"
                              : "bg-cyan-50 text-slate-800 rounded-bl-sm border border-cyan-100"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400'}`}>
                            <span className="text-xs">
                              {formatMessageTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Spacer for sender to balance layout */}
                        {isUserMsg && <div className="w-10 shrink-0" />}
                      </motion.div>
                    );
                  })}
                  <div ref={(el) => {
                    if (el && !messagesLoading && messages.length > 0) {
                      setTimeout(() => {
                        el.scrollIntoView({ behavior: "smooth", block: "end" });
                      }, 100);
                    }
                  }} />
                </div>
              )}
            </div>

            {/* Mobile Message Input */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-white border-t border-cyan-100 shadow-lg shadow-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 sm:py-3 text-sm rounded-2xl border border-cyan-200 bg-cyan-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
                  disabled={sendingMessage}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 rounded-2xl w-12 h-12 p-0 shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Chat View */}
        <div className="hidden lg:flex max-w-4xl mx-auto h-[calc(100vh-200px)] flex-col bg-white rounded-2xl border border-cyan-100 shadow-xl shadow-slate-200/50 overflow-hidden r1-w">
          {/* Chat Header - Unified with rounded top */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-cyan-100 bg-gradient-to-l from-white via-cyan-50 to-cyan-100 rounded-t-2xl shrink-0">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="p-2 -ml-2 text-slate-700 hover:text-[#249fd3] hover:bg-cyan-50 rounded-full transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">
                {getRequestDisplayName(selectedRequest)}
              </h2>
              <p className="text-sm text-slate-500">
                {isAdmin && selectedRequest.user_id ? getUserStatus() : formatDate(selectedRequest.created_at)}
              </p>
            </div>
            {getStatusBadge(selectedRequest.status)}
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 px-6 py-4 bg-white"
          >
            {/* Subject - now inside scroll container */}
            {selectedRequest.title && (
              <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100 shrink-0">
                <p className="font-medium text-slate-800">{selectedRequest.title}</p>
              </div>
            )}

            {/* Freelancer Mini Card - now inside scroll container */}
            {selectedRequest.freelancer_data && (
              <div className="shrink-0">
                <FreelancerMiniCard 
                  freelancer={selectedRequest.freelancer_data} 
                  fallbackDomain={selectedRequest.freelancer_domain}
                  compact
                  showExpand={true}
                  dashboardMode={true}
                  onViewProfile={() => {
                    if (selectedRequest.freelancer_id) {
                      handleViewFreelancer(selectedRequest.freelancer_id);
                    }
                  }}
                />
              </div>
            )}

            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUserMsg = isCurrentUserMessage(msg.sender_id);
                  const showAvatar = !isUserMsg;
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className={`flex ${isUserMsg ? "justify-end" : "justify-start"} items-end`}
                    >
                      {/* Avatar for receiver */}
                      {showAvatar && (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center mr-2 shrink-0 shadow-md">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      {/* Message bubble - Modern chat style */}
                      <div 
                        className={`max-w-[70%] rounded-2xl px-4 py-3 transition-all duration-200 ${
                          isUserMsg
                            ? "bg-gradient-to-br from-[#249fd3] to-cyan-500 text-white rounded-br-sm shadow-lg shadow-cyan-500/20"
                            : "bg-cyan-50 text-slate-800 rounded-bl-sm border border-cyan-100"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400'}`}>
                          <span className="text-xs">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Spacer for sender to balance layout */}
                      {isUserMsg && <div className="w-11 shrink-0" />}
                    </motion.div>
                  );
                })}
                {/* Invisible element to auto-scroll to */}
                <div ref={(el) => {
                  if (el && !messagesLoading && messages.length > 0) {
                    setTimeout(() => {
                      el.scrollIntoView({ behavior: "smooth", block: "end" });
                    }, 100);
                  }
                }} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-3 px-6 py-4 border-t border-cyan-100 bg-gradient-to-r from-white to-cyan-50">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-5 py-3 text-sm rounded-2xl border border-cyan-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
              disabled={sendingMessage}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 rounded-2xl w-12 h-12 p-0 shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isAdmin ? "All Requests" : "My Requests"}</h1>
        <p className="text-muted-foreground">
          {isAdmin 
            ? "Manage user requests and communications" 
            : "View your messages to Milit Company"
          }
        </p>
      </div>
      
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-gray-900">{isAdmin ? "No requests yet" : "No requests yet"}</h3>
          <p className="text-gray-500 mb-4">
            {isAdmin 
              ? "User requests will appear here" 
              : "Contact Milit Company to start a conversation"
            }
          </p>
          {!isAdmin && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" asChild>
                <a href="/contact">Contact Us</a>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((request, index) => {
            const freelancer = request.freelancer_id ? freelancerInfoMap.get(request.freelancer_id) : null;
            return (
            <ScrollReveal key={request.id} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate text-gray-900">
                        {getRequestDisplayName(request)}
                      </p>
                      {isAdmin && getUserEmail(request) && (
                        <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          {getUserEmail(request)}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(request.status)}
                  </div>
                </div>
                
                {/* Subject */}
                {request.title && (
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-gray-900">{request.title}</p>
                  </div>
                )}
                
                {/* Freelancer Mini Card */}
                {request.freelancer_data && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <FreelancerMiniCard 
                      freelancer={request.freelancer_data}
                      fallbackDomain={request.freelancer_domain}
                      compact
                      showExpand={false}
                      dashboardMode={true}
                      onViewProfile={() => {
                        if (request.freelancer_id) {
                          handleViewFreelancer(request.freelancer_id);
                        }
                      }}
                    />
                  </div>
                )}
                
                {/* Last message preview */}
                {request.last_message && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {truncateMessage(request.last_message)}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {request.status === "pending" && "Waiting for response"}
                      {request.status === "received" && "Received response"}
                      {request.status === "answered" && "Answered"}
                    </span>
                  </div>
                  {canCreate('requests') && (
                    <Button variant="ghost" size="sm" className="shrink-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => handleSelectRequest(request)}>
                      Open Chat →
                    </Button>
                  )}
                </div>
              </motion.div>
            </ScrollReveal>
          )})}
        </div>
      )}
    </div>
  );

}