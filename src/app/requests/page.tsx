"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Send, 
  ArrowLeft,
  Loader2,
  ChevronLeft,
  Mail,
  AlertTriangle
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
  // Freelancer data fields
  freelancer_id?: string | null;
  freelancer_domain?: string | null;
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

// ── MODULE-LEVEL COMPONENT (critical) ──
// Defined OUTSIDE the page component so its function reference never changes between
// parent renders. When defined inside, React sees a new component type on every render
// (because it's a new function object), unmounts the old instance and mounts a new one,
// which restarts the Framer Motion animation and causes visible flickering.
function TypingBubble({ mobile = false }: { mobile?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex justify-start items-end"
    >
      <div className={`${mobile ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center mr-2 shrink-0 shadow-md`}>
        <User className="w-4 h-4 text-white" />
      </div>
      <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-2xl rounded-bl-sm border border-cyan-100 dark:border-cyan-900/30 px-4 py-3">
        <span className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </motion.div>
  );
}

export default function UserRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Anchor element always rendered as the last child of the scroll container.
  // scrollIntoView on this element is the single scroll mechanism for messages + typing.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // useState (not ref) for the local "am I currently typing?" guard.
  // Using state means the guard value is always the committed value React sees,
  // so handleTyping's closure is never stale after a re-render.
  const [localIsTyping, setLocalIsTyping] = useState(false);
  // useRef (not useState) so sendTypingStatus always has the latest channel synchronously
  const typingChannelRef = useRef<any>(null);
  const supabase = createClient();

  // Fetch current user and requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        
        // Fetch only this user's requests
        const { data } = await supabase
          .from("requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          // Fetch all domains once → build id→name map to resolve domain_id in freelancer_data
          const { data: allDomains } = await supabase.from('domains').select('id, name');
          const domainNameMap = new Map<string, string>();
          allDomains?.forEach(d => domainNameMap.set(d.id, d.name));

          // Inject the resolved domain name into freelancer_data for every request.
          const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
          const injectDomain = (r: any) => {
            if (!r.freelancer_data) return r;
            const fd = r.freelancer_data;
            const existing = typeof fd.domain === 'string' && fd.domain.trim() !== '' && !isUUID(fd.domain)
              ? fd.domain : null;
            const fromCol = typeof r.freelancer_domain === 'string' && r.freelancer_domain.trim() !== '' && !isUUID(r.freelancer_domain)
              ? r.freelancer_domain : null;
            const fromMap = typeof fd.domain_id === 'string' ? (domainNameMap.get(fd.domain_id) ?? null) : null;
            const domainName = existing || fromCol || fromMap || null;
            return { ...r, freelancer_data: { ...fd, domain: domainName }, freelancer_domain: domainName ?? r.freelancer_domain };
          };

          // Get last messages (ascending to get oldest first, then take last)
          const { data: lastMessages } = await supabase
            .from('request_messages')
            .select('request_id, message, created_at')
            .order('created_at', { ascending: true });
          
          const lastMsgMap = new Map<string, string>();
          lastMessages?.forEach(m => {
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
      setLoading(false);
    };

    fetchRequests();
  }, [supabase]);

  // ── PRESENCE FIX ──
  // Step 1: Fetch the admin user ID once and read their last-known status from the DB.
  useEffect(() => {
    const setupAdmin = async () => {
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin'])
        .limit(1);

      if (!adminUsers || adminUsers.length === 0) return;

      const adminId = adminUsers[0].id;
      setAdminUserId(adminId);

      // Read last-known status so we can show "last seen …" on initial load
      const { data: statusData } = await supabase
        .from('user_status')
        .select('is_online, last_seen')
        .eq('user_id', adminId)
        .maybeSingle();

      if (statusData) {
        setOnlineStatus(prev => ({
          ...prev,
          [adminId]: {
            online: statusData.is_online,
            lastSeen: statusData.last_seen,
          },
        }));
      }
    };

    setupAdmin();
  }, [supabase]);

  // ── PRESENCE FIX ──
  // Step 2: Join the shared `chat_presence` channel.
  //   • Track OWN user ID (not the admin's) so the admin side can detect this user.
  //   • Listen for the admin's join / leave / sync events to update their status locally.
  useEffect(() => {
    if (!currentUserId || !adminUserId) return;

    const presenceChannel = supabase.channel('chat_presence', {
      config: { presence: { key: currentUserId } },   // ← own ID, not adminUserId
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // Only users in the state are online - get all keys from presence state
        const onlineUserIds = Object.keys(state);
        const isAdminOnline = onlineUserIds.includes(adminUserId);
        
        setOnlineStatus(prev => ({
          ...prev,
          [adminUserId]: {
            online: isAdminOnline,
            // Only overwrite lastSeen when going offline; keep the previous value while online
            lastSeen: !isAdminOnline
              ? (new Date().toISOString())
              : prev[adminUserId]?.lastSeen,
          },
        }));
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        if (key === adminUserId) {
          setOnlineStatus(prev => ({
            ...prev,
            [adminUserId]: { online: true, lastSeen: prev[adminUserId]?.lastSeen },
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key === adminUserId) {
          const now = new Date().toISOString();
          setOnlineStatus(prev => ({
            ...prev,
            [adminUserId]: { online: false, lastSeen: now },
          }));
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [supabase, currentUserId, adminUserId]);

  // Update user_status table so the admin side can also read a persistent lastSeen.
  useEffect(() => {
    if (!currentUserId) return;

    const updateUserStatus = async (isOnline: boolean) => {
      try {
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('[User Status] Error:', err);
      }
    };

    updateUserStatus(true);

    const handleActivity = () => updateUserStatus(true);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      updateUserStatus(false);
    };
  }, [supabase, currentUserId]);

  // Mark offline in DB on tab close (best-effort)
  useEffect(() => {
    const updateStatus = async (isOnline: boolean) => {
      if (currentUserId) {
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    };

    const handleBeforeUnload = () => {
      updateStatus(false);
    };

    // Handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User left the tab - mark as offline temporarily, will be updated on activity
        updateStatus(false);
      } else if (document.visibilityState === 'visible') {
        // User returned - mark as online
        updateStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateStatus(false);
    };
  }, [supabase, currentUserId]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const channel = supabase
      .channel('request_messages')
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
      supabase.removeChannel(channel);
    };
  }, [selectedRequest?.id, supabase]);

  // ── REAL-TIME STATUS SUBSCRIPTION ──
  // Subscribe to request status changes to sync with admin actions
  // This ensures user sees "received" when admin opens chat, "answered" when admin replies
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const statusChannel = supabase
      .channel('request_status_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${selectedRequest.id}`
        },
        (payload) => {
          const newStatus = payload.new.status as Request['status'];
          // Update the selected request status
          setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
          // Update the status in the requests list
          setRequests(prev =>
            prev.map(r =>
              r.id === selectedRequest.id ? { ...r, status: newStatus } : r
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [selectedRequest?.id, supabase]);

  // ── TYPING CHANNEL ──
  // One channel instance per conversation — used for BOTH sending and receiving.
  useEffect(() => {
    if (!selectedRequest?.id || !currentUserId) return;

    const channelName = `typing_req_${selectedRequest.id}`;

    const ch = supabase
      .channel(channelName, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { requestId, userId, isTyping } = payload.payload ?? {};
        if (requestId !== selectedRequest.id || userId === currentUserId) return;
        // ── RECEIVER GUARD ──
        // Functional update: only schedules a re-render when the value actually changes.
        // Without this, every duplicate broadcast (e.g. from reconnects) would call
        // setState and trigger a re-render even if adminIsTyping was already true,
        // which remounts child components and causes visible flickering.
        setAdminIsTyping(prev => {
          const next = Boolean(isTyping);
          return prev === next ? prev : next;
        });
      });

    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        typingChannelRef.current = ch;
      }
    });

    return () => {
      typingChannelRef.current = null;
      setLocalIsTyping(false);
      supabase.removeChannel(ch);
      setAdminIsTyping(false);
    };
  }, [selectedRequest?.id, currentUserId, supabase]);

  // Send typing status — uses the already-subscribed channel stored in the ref
  const sendTypingStatus = (isTyping: boolean) => {
    if (!selectedRequest?.id || !currentUserId || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { requestId: selectedRequest.id, userId: currentUserId, isTyping },
    });
  };

  // ── DEBOUNCE FIX (final) ──
  // localIsTyping (useState) gates the "started typing" broadcast so it fires ONCE
  // per typing burst — not on every keystroke.
  // The inactivity timeout resets on every key and fires "stopped typing" after 2 s.
  const handleTyping = () => {
    if (!localIsTyping) {
      // First keystroke of this burst → announce typing once
      setLocalIsTyping(true);
      sendTypingStatus(true);
    }
    // Restart the inactivity timer on every key
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setLocalIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  // Fetch messages when a request is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedRequest) return;
      setMessagesLoading(true);
      try {
        const response = await fetch(`/api/requests/messages?request_id=${selectedRequest.id}`);
        const data = await response.json();
        if (data.messages) {
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

  // ── SCROLL FIX ──
  // Single source of truth for auto-scroll. Runs whenever messages arrive OR the
  // typing indicator appears/disappears. Targets messagesEndRef — a zero-height div
  // rendered as the absolute last child of the scroll container, placed after the
  // TypingBubble — so it is always in the DOM and always below the bubble.
  useEffect(() => {
    if (messagesLoading) return;
    
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto', 
          block: 'end' 
        });
      }
    };

    // Immediate scroll for new messages
    scrollToBottom();
    
    // Additional scroll after a short delay for mobile/tablet
    const timer = setTimeout(scrollToBottom, 100);
    const timer2 = setTimeout(scrollToBottom, 300);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [messages, adminIsTyping, messagesLoading]);

  // ── RESIZE SCROLL FIX ──
  // Re-scroll when window is resized (tablet/mobile orientation changes)
  useEffect(() => {
    const handleResize = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto', 
          block: 'end' 
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;
    sendTypingStatus(false);
    setLocalIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
        setNewMessage("");
        // Status is now handled via real-time subscription
        // Do NOT manually update status here - it will be updated by:
        // 1. Admin opens conversation → "received"
        // 2. Admin sends message → "answered"
        // Scroll is handled by the unified useEffect on [messages, adminIsTyping]
        // which fires when the realtime subscription delivers the new message.
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "received": return <CheckCircle className="w-4 h-4 text-[#249fd3]" />;
      case "answered": return <XCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastSeen = (lastSeen: string) => {
    return new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── PRESENCE FIX ──
  // getAdminStatus now ONLY returns online / last-seen text.
  // The typing indicator is rendered as a chat bubble in the message area below.
  const getAdminStatus = () => {
    if (!adminUserId) return <span className="text-xs text-slate-400">Offline</span>;

    const adminStatus = onlineStatus[adminUserId];

    if (adminStatus?.online) {
      return <span className="text-xs text-green-500 dark:text-green-400">Online</span>;
    }

    if (adminStatus?.lastSeen) {
      return (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {"last seen " + formatLastSeen(adminStatus.lastSeen)}
        </span>
      );
    }

    return <span className="text-xs text-slate-400">Offline</span>;
  };

  const isCurrentUserMessage = (senderId: string): boolean => currentUserId === senderId;

  const handleViewFreelancer = (freelancerId: string) => {
    window.open(`/freelancers/profile/${freelancerId}`, '_blank');
  };

  // ==================== CHAT VIEW ====================
  if (selectedRequest) {
    return (
      <>
        {/* Mobile Chat View - Full Screen */}
        <div className={`fixed inset-0 z-50 bg-white dark:bg-[#111111] lg:hidden ${isMobileChatOpen ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col bg-white dark:bg-[#111111] rounded-t-2xl overflow-hidden">
            {/* Mobile Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-l from-white dark:from-[#111111] via-cyan-50 dark:via-cyan-950/30 to-cyan-100 dark:to-cyan-900/20 rounded-t-2xl shrink-0">
              <button 
                onClick={() => setIsMobileChatOpen(false)}
                className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:text-[#249fd3] hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-full transition-all duration-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate text-slate-900 dark:text-white">
                  Admin
                </h2>
                {/* Header shows ONLY online/offline — typing bubble is in the chat area */}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getAdminStatus()}
                </p>
              </div>
              {getStatusBadge(selectedRequest.status)}
            </div>

            {/* Mobile Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 p-3 sm:p-4 pb-28 bg-white dark:bg-[#111111]"
            >
              {/* Subject */}
              {selectedRequest.title && (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-100 dark:border-cyan-900/30 shrink-0">
                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{selectedRequest.title}</p>
                </div>
              )}
              
              {/* Freelancer Mini Card */}
              {selectedRequest.freelancer_data && (
                <div className="shrink-0">
                  <FreelancerMiniCard 
                    freelancer={selectedRequest.freelancer_data} 
                    fallbackDomain={selectedRequest.freelancer_domain}
                    compact
                    showExpand={true}
                    onViewProfile={() => {
                      if (selectedRequest.freelancer_id) handleViewFreelancer(selectedRequest.freelancer_id);
                    }}
                  />
                </div>
              )}
              
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300 dark:text-cyan-600" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg) => {
                    const isUserMsg = isCurrentUserMessage(msg.sender_id);
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`flex ${isUserMsg ? "justify-end" : "justify-start"} items-end`}
                      >
                        {!isUserMsg && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center mr-2 shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div 
                          className={`max-w-[70%] sm:max-w-[70%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                            isUserMsg
                              ? "bg-gradient-to-br from-[#249fd3] to-cyan-500 text-white rounded-br-sm shadow-md shadow-cyan-500/20"
                              : "bg-cyan-50 dark:bg-cyan-950/30 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-cyan-100 dark:border-cyan-900/30"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                            <span className="text-xs">{formatMessageTime(msg.created_at)}</span>
                          </div>
                        </div>
                        {isUserMsg && <div className="w-10 shrink-0" />}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* ── TYPING INDICATOR BUBBLE (mobile) ── */}
              {adminIsTyping && <TypingBubble mobile />}
              {/* ── SCROLL ANCHOR: always the last DOM node in this container ── */}
              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Message Input */}
            <div className="shrink-0 p-3 sm:p-4 bg-white dark:bg-[#111111] border-t border-cyan-100 dark:border-cyan-900/30 shadow-lg shadow-slate-100 dark:shadow-none">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 sm:py-3 text-sm rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
                  disabled={sendingMessage}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 rounded-2xl w-12 h-12 p-0 shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Chat View */}
        <div className="hidden lg:flex max-w-4xl mx-auto h-[calc(100vh-200px)] flex-col bg-white dark:bg-[#111111] rounded-2xl border border-cyan-100 dark:border-cyan-900/30 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden mc-1">
          {/* Chat Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-l from-white dark:from-[#111111] via-cyan-50 dark:via-cyan-950/30 to-cyan-100 dark:to-cyan-900/20 rounded-t-2xl shrink-0 ">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:text-[#249fd3] hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-full transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900 dark:text-white">Admin</h2>
              {/* Header shows ONLY online/offline — typing bubble is in the chat area */}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {getAdminStatus()}
              </p>
            </div>
            {getStatusBadge(selectedRequest.status)}
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 px-6 py-4 pb-20 bg-white dark:bg-[#111111]"
          >
            {/* Subject */}
            {selectedRequest.title && (
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-100 dark:border-cyan-900/30 shrink-0">
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedRequest.title}</p>
              </div>
            )}

            {/* Freelancer Mini Card */}
            {selectedRequest.freelancer_data && (
              <div className="shrink-0">
                <FreelancerMiniCard 
                  freelancer={selectedRequest.freelancer_data} 
                  fallbackDomain={selectedRequest.freelancer_domain}
                  compact
                  showExpand={true}
                  onViewProfile={() => {
                    if (selectedRequest.freelancer_id) handleViewFreelancer(selectedRequest.freelancer_id);
                  }}
                />
              </div>
            )}

            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300 dark:text-cyan-600" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUserMsg = isCurrentUserMessage(msg.sender_id);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className={`flex ${isUserMsg ? "justify-end" : "justify-start"} items-end`}
                    >
                      {!isUserMsg && (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center mr-2 shrink-0 shadow-md">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div 
                        className={`max-w-[70%] rounded-2xl px-4 py-3 transition-all duration-200 ${
                          isUserMsg
                            ? "bg-gradient-to-br from-[#249fd3] to-cyan-500 text-white rounded-br-sm shadow-lg shadow-cyan-500/20"
                            : "bg-cyan-50 dark:bg-cyan-950/30 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-cyan-100 dark:border-cyan-900/30"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                          <span className="text-xs">{formatMessageTime(msg.created_at)}</span>
                        </div>
                      </div>
                      {isUserMsg && <div className="w-11 shrink-0" />}
                    </motion.div>
                  );
                })}
              </>
            )}

            {/* ── TYPING INDICATOR BUBBLE (desktop) ── */}
            {adminIsTyping && <TypingBubble />}
            {/* ── SCROLL ANCHOR: always the last DOM node in this container ── */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex gap-3 px-6 py-4 border-t border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-r from-white dark:from-[#111111] to-cyan-50 dark:to-cyan-950/20">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-5 py-3 text-sm rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
              disabled={sendingMessage}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 rounded-2xl w-12 h-12 p-0 shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Requests</h1>
        <p className="text-muted-foreground">View your messages to Milit Company</p>
      </div>
      
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">No requests yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Contact Milit Company to start a conversation</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <a href="/contact">Contact Us</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((request, index) => (
            <ScrollReveal key={request.id} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <User className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-white">Admin</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(request.status)}</div>
                </div>
                
                {/* Subject */}
                {request.title && (
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{request.title}</p>
                  </div>
                )}
                
                {/* Freelancer Mini Card */}
                {request.freelancer_data && (
                  <FreelancerMiniCard 
                    showExpand={false} 
                    freelancer={request.freelancer_data}
                    fallbackDomain={request.freelancer_domain}
                    compact
                    onViewProfile={() => {
                      if (request.freelancer_id) handleViewFreelancer(request.freelancer_id);
                    }}
                  />
                )}
                
                {/* Last message preview */}
                {request.last_message && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {request.last_message && request.last_message.length > 60
                        ? request.last_message.substring(0, 60) + "..."
                        : request.last_message || "No messages yet"}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {request.status === "pending" && "Waiting for response"}
                      {request.status === "received" && "Received response"}
                      {request.status === "answered" && "Answered"}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => {
                    setSelectedRequest(request);
                    setIsMobileChatOpen(true);
                  }}>
                    Open Chat →
                  </Button>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}