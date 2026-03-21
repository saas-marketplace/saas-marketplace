"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FreelancerMiniCard } from "@/components/ui/freelancer-mini-card";
import { MessageBubble } from "@/components/requests/MessageBubble";

interface Request {
  id: string;
  user_id: string;
  title: string | null;
  status: "pending" | "received" | "answered";
  created_at: string;
  last_message?: string;
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
  // ── SCROLL: single anchor div always rendered as the absolute last child ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const typingChannelRef = useRef<any>(null);
  const supabase = createClient();
  
  // ── SCROLL TO BOTTOM BUTTON STATE ──
  const [showScrollButton, setShowScrollButton] = useState(false);

  // ── SCROLL HELPER ──
  // Uses the scroll container's scrollTop directly (most reliable cross-device method).
  // Falls back to scrollIntoView on the anchor div.
  // Wrapped in requestAnimationFrame so it always runs after the DOM has painted
  // the new message / typing bubble — avoiding the "one message behind" problem.
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // Cancel any pending RAF to avoid stacking
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;

      // Primary: scroll the container element directly — works on all devices/keyboards
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        return;
      }

      // Fallback: scroll the anchor into view
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
      }
    });
  }, []);

  // Fetch current user and requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        
        const { data } = await supabase
          .from("requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          const { data: allDomains } = await supabase.from('domains').select('id, name');
          const domainNameMap = new Map<string, string>();
          (allDomains || []).forEach((d: any) => domainNameMap.set(d.id, d.name));

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

          const { data: lastMessages } = await supabase
            .from('request_messages')
            .select('request_id, message, created_at')
            .order('created_at', { ascending: true });
          
          const lastMsgMap = new Map<string, string>();
          (lastMessages || []).forEach((m: any) => {
            lastMsgMap.set(m.request_id, m.message);
          });
          
          const requestsWithLastMsg = (data as any[])
            .map((r: any) => injectDomain(r))
            .map((r: any) => ({
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

  // ── PRESENCE: fetch admin ID and initial status ──
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

  // ── PRESENCE: join shared channel, track own ID, watch admin ──
  useEffect(() => {
    if (!currentUserId || !adminUserId) return;

    const presenceChannel = supabase.channel('chat_presence', {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineUserIds = Object.keys(state);
        const isAdminOnline = onlineUserIds.includes(adminUserId);
        
        setOnlineStatus(prev => ({
          ...prev,
          [adminUserId]: {
            online: isAdminOnline,
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

  // ── PRESENCE: update user_status table ──
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

  // ── PRESENCE: mark offline on tab close / visibility change ──
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

    const handleBeforeUnload = () => { updateStatus(false); };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateStatus(false);
      } else if (document.visibilityState === 'visible') {
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
          event: '*',
          schema: 'public',
          table: 'request_messages',
          filter: `request_id=eq.${selectedRequest.id}`
        },
        (payload: any) => {
          // Handle INSERT - new message
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as RequestMessage;
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              const newMessages = [...prev, newMessage];
              return newMessages.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
          // Handle DELETE - message removed
          if (payload.eventType === 'DELETE') {
            const deletedMessage = payload.old as RequestMessage;
            setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRequest?.id, supabase]);

  // ── REAL-TIME STATUS SUBSCRIPTION ──
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
        (payload: any) => {
          const newStatus = payload.new.status as Request['status'];
          setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
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
  useEffect(() => {
    if (!selectedRequest?.id || !currentUserId) return;

    const channelName = `typing_req_${selectedRequest.id}`;

    const ch = supabase
      .channel(channelName, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { requestId, userId, isTyping } = payload.payload ?? {};
        if (requestId !== selectedRequest.id || userId === currentUserId) return;
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

  // Send typing status
  const sendTypingStatus = (isTyping: boolean) => {
    if (!selectedRequest?.id || !currentUserId || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { requestId: selectedRequest.id, userId: currentUserId, isTyping },
    });
  };

  const handleTyping = () => {
    if (!localIsTyping) {
      setLocalIsTyping(true);
      sendTypingStatus(true);
    }
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
      // Verify user is authenticated before fetching
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("No active session, cannot fetch messages");
        setMessagesLoading(false);
        return;
      }
      
      setMessagesLoading(true);
      try {
        const response = await fetch(`/api/requests/messages?request_id=${selectedRequest.id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
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

  // ── AUTO-SCROLL: messages or typing indicator changed ──
  // No early return guard on messagesLoading — we want to scroll after load completes too.
  // RAF ensures the DOM has painted the new node before we measure scrollHeight.
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, adminIsTyping, scrollToBottom]);

  // ── AUTO-SCROLL: initial load — jump instantly (no animation) ──
  useEffect(() => {
    if (!messagesLoading) {
      scrollToBottom('instant' as ScrollBehavior);
    }
  }, [messagesLoading, scrollToBottom]);

  // ── AUTO-SCROLL: container / keyboard resize (mobile keyboards, orientation) ──
  // Attached only while a chat is open. Uses ResizeObserver on the container
  // (fires whenever its height changes, e.g. mobile soft keyboard) and
  // visualViewport for extra reliability on iOS Safari.
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const container = chatContainerRef.current;

    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => scrollToBottom('smooth'));
      ro.observe(container);
    }

    const handleVVResize = () => scrollToBottom('smooth');
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVVResize);
      window.visualViewport.addEventListener('scroll', handleVVResize);
    }

    return () => {
      ro?.disconnect();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVVResize);
        window.visualViewport.removeEventListener('scroll', handleVVResize);
      }
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [selectedRequest?.id, scrollToBottom]);

  // ── SCROLL POSITION DETECTION FOR BUTTON ──
  // Shows "scroll to bottom" button when user scrolls up on mobile/tablet
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button if user is not at the bottom (scrolled up)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [chatContainerRef.current]);

  const handleScrollToBottom = () => {
    scrollToBottom('smooth');
    setShowScrollButton(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;
    sendTypingStatus(false);
    setLocalIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Get session for authorization header
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("No active session, cannot send message");
      setSendingMessage(false);
      return;
    }
    
    try {
      const response = await fetch("/api/requests/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          message: newMessage.trim(),
        }),
        credentials: 'include',
      });

      if (response.ok) {
        setNewMessage("");
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getAdminStatus()}
                </p>
              </div>
              {getStatusBadge(selectedRequest.status)}
            </div>

            {/* Mobile Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 p-3 sm:p-4 bg-white dark:bg-[#111111]"
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
                <div className="flex flex-col gap-4 pb-2 sm:pb-4">
                  {messages.map((msg) => {
                    const isUserMsg = isCurrentUserMessage(msg.sender_id);
                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isUserMsg={isUserMsg}
                        currentUserId={currentUserId || ''}
                        onDelete={(messageId) => {
                          // Optimistic update: immediately remove message from UI
                          setMessages(prev => prev.filter(m => m.id !== messageId));
                        }}
                        mobile
                      />
                    );
                  })}
                </div>
              )}

              {/* Typing indicator bubble */}
              {adminIsTyping && <TypingBubble mobile />}
              {/* Scroll anchor — must be the absolute last node in the container */}
              <div ref={messagesEndRef} style={{ height: 0, flexShrink: 0 }} />
            </div>

            {/* Scroll to Bottom Button - Mobile/Tablet Only */}
            {showScrollButton && (
              <button
                onClick={handleScrollToBottom}
                className="lg:hidden absolute bottom-20 right-6 z-10 bg-gradient-to-r from-[#249fd3] to-cyan-400 text-white p-3 rounded-full shadow-lg shadow-cyan-500/30 hover:scale-110 transition-transform"
                aria-label="Scroll to bottom"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}

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
          <div className="flex items-center gap-4 px-6 py-4 border-b border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-l from-white dark:from-[#111111] via-cyan-50 dark:via-cyan-950/30 to-cyan-100 dark:to-cyan-900/20 rounded-t-2xl shrink-0">
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
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {getAdminStatus()}
              </p>
            </div>
            {getStatusBadge(selectedRequest.status)}
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 px-6 py-4 bg-white dark:bg-[#111111]"
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
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isUserMsg={isUserMsg}
                      currentUserId={currentUserId || ''}
                      onDelete={(messageId) => {
                        // Optimistic update: immediately remove message from UI
                        setMessages(prev => prev.filter(m => m.id !== messageId));
                      }}
                    />
                  );
                })}
              </>
            )}

            {/* Typing indicator bubble */}
            {adminIsTyping && <TypingBubble />}
            {/* Scroll anchor — must be the absolute last node in the container */}
            <div ref={messagesEndRef} style={{ height: 0, flexShrink: 0 }} />
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