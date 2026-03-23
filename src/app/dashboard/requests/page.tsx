"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
// Centralized permissions - loads once at app level
import { usePermissions } from "@/stores/permissions-context";
import { useSuspended } from "@/components/ui/suspended-context";
import { useUserStatus } from "@/stores/user-status-context";
import { useAuth } from "@/components/providers/auth-provider";
import { SectionAccessGuard } from "@/components/ui/section-access-guard";
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
  Folder,
  ChevronDown,
  Trash2,
  X
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
  domains?: { name: string } | null;
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

// ── REQUESTS CACHE (instant load on reload) ──
const REQUESTS_CACHE_KEY = 'requests_cache';

// Load cached requests for instant display
const loadCachedRequests = (): Request[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(REQUESTS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('[Requests] Cache load error:', e);
  }
  return null;
};

// Save requests to cache
const saveRequestsToCache = (requests: Request[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('[Requests] Cache save error:', e);
  }
};

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
      <div className="bg-cyan-50 rounded-2xl rounded-bl-sm border border-cyan-100 px-4 py-3">
        <span className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </motion.div>
  );
}

export default function AdminRequestsPage() {
  // Centralized permissions - no duplicate API calls
  const { isLoading: permsLoading, isSuperAdmin, permissions, canAccessSection, all } = usePermissions();
  const { isSuspended, isRestored } = useSuspended();
  const { getUserStatus: getUserStatusFromContext } = useUserStatus();
  const { user } = useAuth();

  const isLoading = permsLoading || isSuspended;

  // Debug: Log once when permissions finish loading
  useEffect(() => {
    if (!isLoading && permissions && Object.keys(permissions).length > 0) {
      console.log('[Requests] Permissions loaded ONCE - centralized:', permissions);
    }
  }, [isLoading, permissions]);

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

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── SCROLL TO BOTTOM BUTTON STATE ──
  const [showScrollButton, setShowScrollButton] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  // ── SCROLL: single anchor div always rendered as the absolute last child ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const typingChannelRef = useRef<any>(null);

  // ── SESSION CACHE ──
  // Fetched ONCE on mount. All API calls reuse this token instead of calling
  // getSession() every time a message is loaded or sent — eliminates duplicate
  // /auth/v1/user round-trips that were clogging the network.
  const sessionRef = useRef<{ access_token: string } | null>(null);
  const sessionFetchedRef = useRef(false);

  // ── PRESENCE THROTTLE ──
  // Limits admin "I'm online" upserts to once every 30 s no matter how fast
  // the user moves their mouse / types. Prevents hundreds of DB writes per minute.
  const presenceThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const PRESENCE_THROTTLE_MS = 30_000; // 30 seconds

  const supabase = createClient();

  // ── FETCH SESSION ONCE ──
  // Everything downstream reads sessionRef.current — no component ever calls
  // getSession() or getUser() again on its own.
  useEffect(() => {
    if (sessionFetchedRef.current) return;
    sessionFetchedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { access_token: string } | null } }) => {
      if (session) {
        sessionRef.current = { access_token: session.access_token };
      }
    });

    // Keep the cached token fresh whenever Supabase auto-refreshes it.
    // This fires at most once per refresh interval (~1 hour) — not on every render.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { access_token: string } | null) => {
      sessionRef.current = session ? { access_token: session.access_token } : null;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // ── SCROLL HELPER ──
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        return;
      }
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
      }
    });
  }, []);

  // ── SCROLL TO BOTTOM BUTTON HANDLER ──
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // ── SCROLL DETECTION FOR SHOW/HIDE BUTTON ──
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    setShowScrollButton(!isAtBottom);
  }, []);

  // Access control check
  if (!isLoading && !canAccessSection('requests')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 text-center max-w-md">
          You don't have permission to view this section. Contact your administrator for access.
        </p>
      </div>
    );
  }

  // ── FETCH GUARD ──
  // Prevents double-fetch on StrictMode double-mount or fast navigation.
  const fetchedRef = useRef(false);

  // Fetch current user and requests with caching for instant load
  useEffect(() => {
    if (isSuspended) return;
    // Guard: only run once per mount cycle AND only when user is ready
    if (fetchedRef.current) return;
    
    // Wait for user to be ready before fetching
    if (!user) {
      return;
    }
    
    fetchedRef.current = true;

    // STEP 1: Load cached data FIRST for instant display (zero delay on reload)
    const cachedRequests = loadCachedRequests();
    if (cachedRequests && cachedRequests.length > 0) {
      console.log('[Requests] Loaded from cache:', cachedRequests.length);
      setRequests(cachedRequests);
    }

    // STEP 2: Fetch fresh data in background
    const fetchRequests = async () => {
      setCurrentUserId(user.id);
      const isAdminUser =
        permissions.dashboard?.includes('view') ||
        permissions.team?.includes('view') ||
        false;
      setIsAdmin(isAdminUser);

      // ── WAVE 1: requests + domains fire in parallel ──
      // Previously sequential (requests first, then domains); now simultaneous.
      let requestsQuery = supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdminUser) requestsQuery = requestsQuery.eq("user_id", user.id);

      const [{ data }, { data: allDomains }] = await Promise.all([
        requestsQuery,
        supabase.from('domains').select('id, name'),
      ]);

      if (!data) {
        setLoading(false);
        return;
      }

      // Build domain lookup map
      const domainNameMap = new Map<string, string>();
      (allDomains as any[])?.forEach(d => domainNameMap.set(d.id, d.name));

      const isUUID = (v: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

      const injectDomain = (r: any) => {
        if (!r.freelancer_data) return r;
        const fd = r.freelancer_data;
        const existing =
          typeof fd.domain === 'string' && fd.domain.trim() !== '' && !isUUID(fd.domain)
            ? fd.domain : null;
        const fromCol =
          typeof r.freelancer_domain === 'string' &&
          r.freelancer_domain.trim() !== '' &&
          !isUUID(r.freelancer_domain)
            ? r.freelancer_domain : null;
        const fromMap =
          typeof fd.domain_id === 'string' ? (domainNameMap.get(fd.domain_id) ?? null) : null;
        const domainName = existing || fromCol || fromMap || null;
        console.log(`[domain] "${fd.name}" domain_id=${fd.domain_id} → "${domainName}"`);
        return {
          ...r,
          freelancer_data: { ...fd, domain: domainName },
          freelancer_domain: domainName ?? r.freelancer_domain,
        };
      };

      if (isAdminUser && data.length > 0) {
        // ── WAVE 2 (admin): users + freelancers + last messages all fire together ──
        // Previously 3 sequential awaits (each blocked on the previous).
        const userIds = Array.from(new Set((data as any[]).map(r => r.user_id)));
        const freelancerIds = Array.from(
          new Set((data as any[]).filter(r => r.freelancer_id).map(r => r.freelancer_id))
        ) as string[];

        const [
          { data: usersData },
          { data: freelancersData },
          { data: lastMessages },
        ] = await Promise.all([
          supabase.from('users').select('id, email, full_name').in('id', userIds),
          freelancerIds.length > 0
            ? supabase
                .from('freelancers')
                .select('id, display_name, title, domain_id, skills, experience_level, description, domains(name)')
                .in('id', freelancerIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from('request_messages')
            .select('request_id, message, created_at')
            .order('created_at', { ascending: true }),
        ]);

        const map = new Map<string, UserInfo>();
        (usersData as any[])?.forEach(u => map.set(u.id, u));
        setUserInfoMap(map);

        const freelancerMap = new Map<string, FreelancerInfo>();
        (freelancersData as any[])?.forEach(f => freelancerMap.set(f.id, f));
        setFreelancerInfoMap(freelancerMap);

        const lastMsgMap = new Map<string, string>();
        (lastMessages as any[])?.forEach(m => lastMsgMap.set(m.request_id, m.message));

        const requestsWithUsers = (data as any[])
          .map(r => injectDomain(r))
          .map(r => ({ ...r, users: map.get(r.user_id) || null, last_message: lastMsgMap.get(r.id) || '' }));
        setRequests(requestsWithUsers);
        
        // Save to cache for instant load on next visit
        saveRequestsToCache(requestsWithUsers);
      } else {
        // ── WAVE 2 (non-admin): only last messages needed ──
        const { data: lastMessages } = await supabase
          .from('request_messages')
          .select('request_id, message, created_at')
          .order('created_at', { ascending: true });

        const lastMsgMap = new Map<string, string>();
        (lastMessages as any[])?.forEach(m => lastMsgMap.set(m.request_id, m.message));

        const requestsWithLastMsg = (data as any[])
          .map(r => injectDomain(r))
          .map(r => ({ ...r, last_message: lastMsgMap.get(r.id) || '' }));
        setRequests(requestsWithLastMsg);
        
        // Save to cache for instant load on next visit
        saveRequestsToCache(requestsWithLastMsg);
      }

      setLoading(false);
    };

    fetchRequests();

    // Reset guard on unmount so navigating away then back re-fetches correctly
    return () => { fetchedRef.current = false; };
  }, [supabase, isSuspended, user]);

  // ── CACHE SYNC: keep localStorage in sync with state ──
  // This ensures any realtime updates are also cached
  useEffect(() => {
    if (requests.length > 0) {
      saveRequestsToCache(requests);
    }
  }, [requests]);

  // ── PRESENCE: admin tracks their own presence ──
  // Activity listeners are THROTTLED — only one DB upsert per PRESENCE_THROTTLE_MS
  // instead of one on every mouse-move / key-down event.
  useEffect(() => {
    if (!currentUserId || !isAdmin) return;

    const presenceChannel = supabase.channel('chat_presence', {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ online_at: new Date().toISOString() });
      }
    });

    const updateAdminStatus = async (isOnline: boolean) => {
      try {
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('[Admin Status] Error:', err);
      }
    };

    updateAdminStatus(true);

    // ── THROTTLED activity handler ──
    // Fires at most once per PRESENCE_THROTTLE_MS regardless of how many
    // mouse-move / key-down events the browser emits.
    const handleActivity = () => {
      if (presenceThrottleRef.current) return; // already scheduled → skip
      presenceThrottleRef.current = setTimeout(() => {
        presenceThrottleRef.current = null;
        presenceChannel.track({ online_at: new Date().toISOString() });
        updateAdminStatus(true);
      }, PRESENCE_THROTTLE_MS);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const handleBeforeUnload = async () => {
      await presenceChannel.untrack();
      await supabase.from('user_status').upsert({
        user_id: currentUserId,
        is_online: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await presenceChannel.untrack();
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } else if (document.visibilityState === 'visible') {
        await presenceChannel.track({ online_at: new Date().toISOString() });
        await supabase.from('user_status').upsert({
          user_id: currentUserId,
          is_online: true,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Clear any pending throttle timer so we don't fire after unmount
      if (presenceThrottleRef.current) {
        clearTimeout(presenceThrottleRef.current);
        presenceThrottleRef.current = null;
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (presenceChannel && typeof presenceChannel.untrack === 'function') {
        presenceChannel.untrack();
      }
      if (presenceChannel && typeof presenceChannel.unsubscribe === 'function') {
        supabase.removeChannel(presenceChannel);
      }
      updateAdminStatus(false);
    };
  }, [supabase, currentUserId, isAdmin]);

  // ── PRESENCE: watch selected user's online status ──
  // Uses centralized UserStatusProvider — no per-component fetch.
  useEffect(() => {
    if (!selectedRequest?.user_id) return;

    const userId = selectedRequest.user_id;
    const status = getUserStatusFromContext(userId);
    
    setOnlineStatus(prev => ({
      ...prev,
      [userId]: { online: status.online, lastSeen: status.lastSeen },
    }));
  }, [selectedRequest?.user_id, getUserStatusFromContext]);

  // ── TYPING CHANNEL ──
  useEffect(() => {
    if (!selectedRequest?.id || !currentUserId) return;

    const channelName = `typing_req_${selectedRequest.id}`;

    const ch = supabase
      .channel(channelName, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { requestId, userId: senderId, isTyping } = payload.payload ?? {};
        if (requestId !== selectedRequest.id || senderId === currentUserId) return;
        setUserIsTyping(prev => {
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
      if (ch && typeof ch.unsubscribe === 'function') {
        supabase.removeChannel(ch);
      }
      setUserIsTyping(false);
    };
  }, [selectedRequest?.id, currentUserId, supabase]);

  // Fetch messages when a request is selected
  // Uses the CACHED session token — no extra getSession() call per fetch.
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedRequest) return;

      // Wait up to 2 s for the cached session to be available (set on mount).
      // In practice it will already be there; this just guards the rare cold-start race.
      let token = sessionRef.current?.access_token;
      if (!token) {
        // One-time fallback fetch if the cache isn't warm yet
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn("No active session, cannot fetch messages");
          setMessagesLoading(false);
          return;
        }
        // Warm the cache for all subsequent calls
        sessionRef.current = { access_token: session.access_token };
        token = session.access_token;
      }

      setMessagesLoading(true);
      try {
        const response = await fetch(`/api/requests/messages?request_id=${selectedRequest.id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.status === 401) {
          console.warn("User not authenticated, messages cannot be loaded");
          setMessages([]);
          setMessagesLoading(false);
          return;
        }
        
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

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const messageChannel = supabase
      .channel('admin_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'request_messages',
        filter: `request_id=eq.${selectedRequest.id}`,
      }, (payload: any) => {
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
        if (payload.eventType === 'DELETE') {
          const deletedMessage = payload.old as RequestMessage;
          setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
        }
      })
      .subscribe();

    return () => {
      if (messageChannel && typeof messageChannel.unsubscribe === 'function') {
        supabase.removeChannel(messageChannel);
      }
    };
  }, [selectedRequest?.id, supabase]);

  // ── REAL-TIME STATUS SUBSCRIPTION ──
  useEffect(() => {
    if (!selectedRequest?.id) return;

    const statusChannel = supabase
      .channel('admin_request_status_updates')
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
      if (statusChannel && typeof statusChannel.unsubscribe === 'function') {
        supabase.removeChannel(statusChannel);
      }
    };
  }, [selectedRequest?.id, supabase]);

  // ── AUTO-SCROLL: messages or typing indicator changed ──
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, userIsTyping, scrollToBottom]);

  // ── AUTO-SCROLL: initial load — jump instantly ──
  useEffect(() => {
    if (!messagesLoading) {
      scrollToBottom('instant' as ScrollBehavior);
    }
  }, [messagesLoading, scrollToBottom]);

  // ── AUTO-SCROLL: container / keyboard resize ──
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

    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      setShowScrollButton(!isAtBottom);
    };
    container?.addEventListener('scroll', handleScroll);

    return () => {
      ro?.disconnect();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVVResize);
        window.visualViewport.removeEventListener('scroll', handleVVResize);
      }
      container?.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [selectedRequest?.id, scrollToBottom]);

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

  // Send message using the CACHED session token — no extra getSession() call.
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;

    if (!all.requests.includes('create')) {
      alert('You do not have permission to send messages');
      return;
    }

    sendTypingStatus(false);
    setLocalIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Use cached token; fall back to a one-time fetch only if cache is cold.
    let token = sessionRef.current?.access_token;
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("No active session, cannot send message");
        return;
      }
      sessionRef.current = { access_token: session.access_token };
      token = session.access_token;
    }

    setSendingMessage(true);
    try {
      const response = await fetch("/api/requests/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ request_id: selectedRequest.id, message: newMessage.trim() }),
        credentials: 'include',
      });

      if (response.ok) {
        setNewMessage("");

        setRequests(prev =>
          prev.map(r =>
            r.id === selectedRequest.id
              ? { ...r, status: "answered" as Request["status"], last_message: newMessage.trim() }
              : r
          )
        );
        setSelectedRequest(prev =>
          prev ? { ...prev, status: "answered" as Request["status"], last_message: newMessage.trim() } : null
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async () => {
    if (!requestToDelete || deleting) return;

    if (!all.requests.includes('delete')) {
      alert('You do not have permission to delete this request');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestToDelete.id);

      if (error) {
        console.error('Error deleting request:', error);
        alert('Failed to delete request');
        return;
      }

      setRequests(prev => prev.filter(r => r.id !== requestToDelete.id));
      
      if (selectedRequest?.id === requestToDelete.id) {
        setSelectedRequest(null);
      }
      
      setDeleteConfirmOpen(false);
      setRequestToDelete(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    } finally {
      setDeleting(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirm = (request: Request, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequestToDelete(request);
    setDeleteConfirmOpen(true);
  };

  const handleSelectRequest = async (request: Request) => {
    if (request.status === "pending") {
      try {
        await supabase
          .from("requests")
          .update({ status: "received" })
          .eq("id", request.id)
          .eq("status", "pending");
        
        setRequests(prev =>
          prev.map(r =>
            r.id === request.id ? { ...r, status: "received" as Request["status"] } : r
          )
        );
        
        request = { ...request, status: "received" as Request["status"] };
      } catch (error) {
        console.error("Error updating request status:", error);
      }
    }
    
    setSelectedRequest(request);
    setIsMobileChatOpen(true);
  };

  const handleCloseMobileChat = () => {
    setIsMobileChatOpen(false);
    setSelectedRequest(null);
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

  const getRequestDisplayName = (request: Request) => {
    if (isAdmin) {
      const userInfo = request.users || userInfoMap.get(request.user_id);
      return userInfo?.full_name || userInfo?.email || "Unknown User";
    }
    return "Admin";
  };

  const getUserEmail = (request: Request) => {
    if (isAdmin) {
      const userInfo = request.users || userInfoMap.get(request.user_id);
      return userInfo?.email;
    }
    return null;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const truncateMessage = (message: string | undefined | null): string => {
    if (!message) return "No messages yet";
    return message.length > 60 ? message.substring(0, 60) + "..." : message;
  };

  const isCurrentUserMessage = (senderId: string): boolean => currentUserId === senderId;

  const handleViewFreelancer = (freelancerId: string) => {
    window.open(`/freelancers/profile/${freelancerId}`, '_blank');
  };

  const formatLastSeen = (lastSeen: string) => {
    return new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserStatus = () => {
    if (!selectedRequest?.user_id) return null;

    const userStatus = onlineStatus[selectedRequest.user_id];

    if (userStatus?.online) {
      return <span className="text-xs text-green-500 dark:text-green-400">Online</span>;
    }

    if (userStatus?.lastSeen) {
      return (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {"last seen " + formatLastSeen(userStatus.lastSeen)}
        </span>
      );
    }

    return <span className="text-xs text-slate-400">Offline</span>;
  };

  const getSenderDisplayName = (senderId: string, isCurrentUser: boolean) => {
    if (isCurrentUser) return isAdmin ? "Admin" : "You";
    if (selectedRequest && senderId === selectedRequest.user_id) return isAdmin ? "User" : "You";
    return "Admin";
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
              <div className="flex items-center gap-2">
                {all.requests.includes('delete') && (
                  <button
                    onClick={() => {
                      setRequestToDelete(selectedRequest);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-2 rounded-full bg-gradient-to-r from-white to-cyan-50 border border-cyan-200 text-slate-500 hover:text-red-500 hover:border-red-300 hover:from-red-50 hover:to-red-50/50 transition-all duration-200"
                    title="Delete Request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {getStatusBadge(selectedRequest.status)}
              </div>
            </div>

            {/* Mobile Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 p-3 sm:p-4 pb-2 sm:pb-4 bg-white"
            >
              {selectedRequest.title && (
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 shrink-0">
                  <p className="font-medium text-sm text-slate-800">{selectedRequest.title}</p>
                </div>
              )}
              
              {selectedRequest.freelancer_data && (
                <div className="shrink-0">
                  <FreelancerMiniCard 
                    freelancer={selectedRequest.freelancer_data} 
                    fallbackDomain={selectedRequest.freelancer_domain}
                    compact
                    showExpand={true}
                    dashboardMode={true}
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
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg) => {
                    const isUserMsg = isCurrentUserMessage(msg.sender_id);
                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isUserMsg={isUserMsg}
                        currentUserId={currentUserId || ''}
                        onDelete={(messageId) => {
                          setMessages(prev => prev.filter(m => m.id !== messageId));
                        }}
                        mobile
                      />
                    );
                  })}
                </div>
              )}

              {userIsTyping && <TypingBubble mobile />}
              <div ref={messagesEndRef} style={{ height: 0, flexShrink: 0 }} />
            </div>

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
            <div className="shrink-0 p-3 sm:p-4 bg-white border-t border-cyan-100 shadow-lg shadow-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
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
                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Chat View */}
        <div className="hidden lg:flex max-w-4xl mx-auto h-[calc(100vh-200px)] flex-col bg-white rounded-2xl border border-cyan-100 shadow-xl shadow-slate-200/50 overflow-hidden r1-w">
          {/* Chat Header */}
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
            <div className="flex items-center gap-2">
              {all.requests.includes('delete') && (
                <button
                  onClick={() => {
                    setRequestToDelete(selectedRequest);
                    setDeleteConfirmOpen(true);
                  }}
                  className="p-2 rounded-full bg-gradient-to-r from-white to-cyan-50 border border-cyan-200 text-slate-500 hover:text-red-500 hover:border-red-300 hover:from-red-50 hover:to-red-50/50 transition-all duration-200"
                  title="Delete Request"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {getStatusBadge(selectedRequest.status)}
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 custom-scrollbar overflow-y-auto flex flex-col gap-4 px-6 py-4 bg-white"
          >
            {selectedRequest.title && (
              <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100 shrink-0">
                <p className="font-medium text-slate-800">{selectedRequest.title}</p>
              </div>
            )}

            {selectedRequest.freelancer_data && (
              <div className="shrink-0">
                <FreelancerMiniCard 
                  freelancer={selectedRequest.freelancer_data} 
                  fallbackDomain={selectedRequest.freelancer_domain}
                  compact
                  showExpand={true}
                  dashboardMode={true}
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
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-300" />
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
                        setMessages(prev => prev.filter(m => m.id !== messageId));
                      }}
                    />
                  );
                })}
              </>
            )}

            {userIsTyping && <TypingBubble />}
            <div ref={messagesEndRef} style={{ height: 0, flexShrink: 0 }} />
          </div>

          {/* Message Input */}
          <div className="flex gap-3 px-6 py-4 border-t border-cyan-100 bg-gradient-to-r from-white to-cyan-50">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
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
              {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Request</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this request? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setRequestToDelete(null);
                  }}
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteRequest}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isAdmin ? "All Requests" : "My Requests"}</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Manage user requests and communications" : "View your messages to Milit Company"}
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
            {isAdmin ? "User requests will appear here" : "Contact Milit Company to start a conversation"}
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
                        <p className="text-xs sm:text-sm text-gray-500">{formatDate(request.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {all.requests.includes('delete') && (
                        <button
                          onClick={(e) => openDeleteConfirm(request, e)}
                          className="p-2 rounded-full bg-gradient-to-r from-white to-cyan-50 border border-cyan-200 text-slate-500 hover:text-red-500 hover:border-red-300 hover:from-red-50 hover:to-red-50/50 transition-all duration-200"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  
                  {request.title && (
                    <div className="mb-4">
                      <p className="text-lg font-semibold text-gray-900">{request.title}</p>
                    </div>
                  )}
                  
                  {request.freelancer_data && (
                    <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <FreelancerMiniCard 
                        freelancer={request.freelancer_data}
                        fallbackDomain={request.freelancer_domain}
                        compact
                        showExpand={false}
                        dashboardMode={true}
                        onViewProfile={() => {
                          if (request.freelancer_id) handleViewFreelancer(request.freelancer_id);
                        }}
                      />
                    </div>
                  )}
                  
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
                    {all.requests.includes('create') && (
                      <Button variant="ghost" size="sm" className="shrink-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => handleSelectRequest(request)}>
                        Open Chat →
                      </Button>
                    )}
                  </div>
                </motion.div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Request</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this request? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setRequestToDelete(null);
                }}
                className="flex-1"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteRequest}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}