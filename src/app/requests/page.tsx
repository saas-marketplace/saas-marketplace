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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Fetch admin user ID and subscribe to admin presence
  useEffect(() => {
    const fetchAdminAndSubscribe = async () => {
      // Fetch admin users
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin'])
        .limit(1);
      
      if (adminUsers && adminUsers.length > 0) {
        const adminId = adminUsers[0].id;
        setAdminUserId(adminId);
        console.log('[Admin Presence] Admin ID:', adminId);
        
        // Fetch initial admin status
        const { data: adminStatus } = await supabase
          .from('user_status')
          .select('*')
          .eq('user_id', adminId)
          .maybeSingle();
        
        if (adminStatus) {
          setOnlineStatus(prev => ({
            ...prev,
            [adminId]: {
              online: adminStatus.is_online,
              lastSeen: adminStatus.last_seen
            }
          }));
        }
      }
    };
    
    fetchAdminAndSubscribe();
  }, [supabase]);

  // Subscribe to admin status changes
  useEffect(() => {
    const statusChannel = supabase
      .channel('admin_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        async (payload) => {
          // Fetch admin users to check if this is an admin
          const { data: adminUsers } = await supabase
            .from('users')
            .select('id')
            .in('role', ['admin', 'super_admin'])
            .limit(1);
          
          if (adminUsers && adminUsers.length > 0) {
            const adminId = adminUsers[0].id;
            const payloadNew = payload.new as { user_id: string; is_online: boolean; last_seen: string } | null;
            if (payloadNew && payloadNew.user_id === adminId) {
              setOnlineStatus(prev => ({
                ...prev,
                [payloadNew.user_id]: {
                  online: payloadNew.is_online,
                  lastSeen: payloadNew.last_seen
                }
              }));
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [supabase]);

  // Update user status when page loads and on activity
  useEffect(() => {
    console.log('[User Status] Effect running, currentUserId:', currentUserId);
    
    if (!currentUserId) {
      console.log('[User Status] No user ID, waiting...');
      return;
    }

    // Function to update user status
    const updateUserStatus = async (isOnline: boolean) => {
      try {
        console.log('[User Status] Attempting to update:', isOnline ? 'online' : 'offline', 'for user:', currentUserId);
        
        const { data, error } = await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
        if (error) {
          console.error('[User Status] Supabase error:', error);
        } else {
          console.log('[User Status] Updated successfully:', isOnline ? 'online' : 'offline', data);
        }
      } catch (error) {
        console.error('[User Status] Error updating status:', error);
      }
    };

    // Set user as online on mount
    console.log('[User Status] Setting user as online...');
    updateUserStatus(true);

    // Update last_seen on user activity
    const handleActivity = () => {
      console.log('[User Status] Activity detected, updating...');
      updateUserStatus(true);
    };

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    // Set user as offline on unmount
    return () => {
      console.log('[User Status] Unmounting, setting offline...');
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      updateUserStatus(false);
    };
  }, [supabase, currentUserId]);

  // Update last_seen on beforeunload (when user closes tab/browser)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentUserId) {
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
      supabase.removeChannel(channel);
    };
  }, [selectedRequest?.id, supabase]);

  // Typing indicator subscription using broadcast (faster than database)
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const typingChannel = supabase
      .channel('typing_broadcast')
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          const { requestId, userId, isTyping } = payload.payload;
          // Only show typing if it's for the current request and not from self
          if (requestId === selectedRequest.id && userId !== currentUserId) {
            setAdminIsTyping(isTyping);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [selectedRequest?.id, currentUserId, supabase]);

  // Online status subscription
  useEffect(() => {
    const statusChannel = supabase
      .channel('user_presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        (payload) => {
          const statusData = payload.new as { user_id: string; is_online: boolean; last_seen: string };
          setOnlineStatus(prev => ({
            ...prev,
            [statusData.user_id]: {
              online: statusData.is_online,
              lastSeen: statusData.last_seen
            }
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [supabase]);

  // Send typing status via broadcast (faster than database)
  const typingChannelRef = useRef<any>(null);
  
  const sendTypingStatus = async (isTyping: boolean) => {
    if (!selectedRequest?.id || !currentUserId) return;
    
    // Create channel if not exists and subscribe
    if (!typingChannelRef.current) {
      typingChannelRef.current = supabase.channel('typing_broadcast');
      await typingChannelRef.current.subscribe();
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
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, messagesLoading, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;
    
    // Clear typing status when sending
    sendTypingStatus(false);
    
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
        // Don't manually add message - let realtime subscription handle it
        // This prevents duplicates
        setNewMessage("");
        
        // Update request status locally
        const newStatus = "received";
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

  // Format last seen time
  const formatLastSeen = (lastSeen: string) => {
    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now.getTime() - seen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Last seen just now";
    if (diffMins < 60) return `Last seen ${diffMins} min ago`;
    if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Get admin status (typing or online/offline)
  const getAdminStatus = () => {
    if (adminIsTyping) {
      return (
        <span className="text-xs text-cyan-500 dark:text-cyan-400 flex items-center gap-1">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          typing
        </span>
      );
    }
    
    // Check admin status from onlineStatus state
    if (adminUserId) {
      const adminStatus = onlineStatus[adminUserId];
      
      if (adminStatus?.online) {
        return <span className="text-xs text-green-500 dark:text-green-400">Online</span>;
      }
      
      if (adminStatus?.lastSeen) {
        return <span className="text-xs text-slate-500 dark:text-slate-400">{formatLastSeen(adminStatus.lastSeen)}</span>;
      }
    }
    
    // Default to offline if no status found
    return <span className="text-xs text-slate-400">Offline</span>;
  };

  // Check if message is from current user
  const isCurrentUserMessage = (senderId: string): boolean => {
    return currentUserId === senderId;
  };

  // Handle viewing freelancer profile
  const handleViewFreelancer = (freelancerId: string) => {
    window.open(`/freelancers/profile/${freelancerId}`, '_blank');
  };

  // Get sender display name
  const getSenderDisplayName = (senderId: string, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return "You";
    } else {
      // Check if sender is the request owner
      if (selectedRequest && senderId === selectedRequest.user_id) {
        return "You";
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
              className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 p-3 sm:p-4 pb-28 bg-white dark:bg-[#111111]"
            >
              {/* Subject - inside scroll container */}
              {selectedRequest.title && (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-100 dark:border-cyan-900/30 shrink-0">
                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{selectedRequest.title}</p>
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
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300 dark:text-cyan-600" />
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
                              : "bg-cyan-50 dark:bg-cyan-950/30 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-cyan-100 dark:border-cyan-900/30"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
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
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-white dark:bg-[#111111] border-t border-cyan-100 dark:border-cyan-900/30 shadow-lg shadow-slate-100 dark:shadow-none">
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
                  className="flex-1 px-4 py-2.5 sm:py-3 text-sm rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
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
        <div className="hidden lg:flex max-w-4xl mx-auto h-[calc(100vh-200px)] flex-col bg-white dark:bg-[#111111] rounded-2xl border border-cyan-100 dark:border-cyan-900/30 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden mc-1">
          {/* Chat Header - Unified with rounded top */}
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
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Admin
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {getAdminStatus()}
              </p>
            </div>
            {getStatusBadge(selectedRequest.status)}
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 px-6 py-4 pb-6 bg-white dark:bg-[#111111]"
          >
            {/* Subject - now inside scroll container */}
            {selectedRequest.title && (
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-100 dark:border-cyan-900/30 shrink-0">
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedRequest.title}</p>
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
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300 dark:text-cyan-600" />
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
                            : "bg-cyan-50 dark:bg-cyan-950/30 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-cyan-100 dark:border-cyan-900/30"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
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
          <div className="flex gap-3 px-6 py-4 border-t border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-r from-white dark:from-[#111111] to-cyan-50 dark:to-cyan-950/20">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Requests</h1>
        <p className="text-muted-foreground">
          View your messages to Milit Company
        </p>
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
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Contact Milit Company to start a conversation
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <a href="/contact">Contact Us</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((request, index) => {
            return (
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
                      <p className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-white">
                        Admin
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
                        if (request.freelancer_id) {
                          handleViewFreelancer(request.freelancer_id);
                        }
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
          )})}
        </div>
      )}
    </div>
  );
}
