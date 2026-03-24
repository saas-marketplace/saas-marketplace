"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserStatus {
  online: boolean;
  lastSeen?: string;
}

interface UserStatusContextType {
  getUserStatus: (userId: string) => UserStatus;
  getAllUserStatuses: () => Record<string, UserStatus>;
  isLoading: boolean;
}

const UserStatusContext = createContext<UserStatusContextType>({
  getUserStatus: () => ({ online: false }),
  getAllUserStatuses: () => ({}),
  isLoading: true,
});

export function useUserStatus() {
  return useContext(UserStatusContext);
}

export function UserStatusProvider({ children }: { children: ReactNode }) {
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const fetchedRef = useRef(false);
  const channelsRef = useRef<any[]>([]);

  // Fetch all user statuses once
  const fetchAllUserStatuses = useCallback(async () => {
    // First check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('[UserStatus] No session, skipping status fetch');
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_status')
        .select('user_id, is_online, last_seen');

      if (error) {
        // Ignore AbortError from Supabase lock conflicts
        if (error.name === 'AbortError') {
          console.log('[UserStatus] AbortError - skipping');
          return;
        }
        throw error;
      }

      const statuses: Record<string, UserStatus> = {};
      data?.forEach((status: any) => {
        statuses[status.user_id] = {
          online: status.is_online,
          lastSeen: status.last_seen,
        };
      });

      setUserStatuses(statuses);
      setIsLoading(false);
    } catch (error) {
      // Ignore AbortError
      if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'AbortError') {
        console.log('[UserStatus] AbortError - ignoring');
        return;
      }
      console.error('[UserStatus] Error fetching statuses:', error);
      setIsLoading(false);
    }
  }, [supabase]);

  // Setup real-time subscription for all user status changes
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Initial fetch
    fetchAllUserStatuses();

    // Subscribe to user_status table changes
    const statusChannel = supabase
      .channel('user_status_all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_status',
      }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const status = payload.new as { user_id: string; is_online: boolean; last_seen: string };
          setUserStatuses(prev => ({
            ...prev,
            [status.user_id]: { online: status.is_online, lastSeen: status.last_seen },
          }));
        } else if (payload.eventType === 'DELETE') {
          const status = payload.old as { user_id: string };
          setUserStatuses(prev => {
            const newStatuses = { ...prev };
            delete newStatuses[status.user_id];
            return newStatuses;
          });
        }
      })
      .subscribe();

    channelsRef.current.push(statusChannel);

    // Subscribe to presence changes
    const presenceChannel = supabase.channel('user_presence_all');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineUserIds = Object.keys(state);
        
        setUserStatuses(prev => {
          const newStatuses = { ...prev };
          // Update all users' online status based on presence
          Object.keys(newStatuses).forEach(userId => {
            const isOnline = onlineUserIds.includes(userId);
            newStatuses[userId] = {
              ...newStatuses[userId],
              online: isOnline,
              lastSeen: isOnline ? newStatuses[userId]?.lastSeen : new Date().toISOString(),
            };
          });
          return newStatuses;
        });
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        setUserStatuses(prev => ({
          ...prev,
          [key]: { online: true, lastSeen: prev[key]?.lastSeen },
        }));
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        setUserStatuses(prev => ({
          ...prev,
          [key]: { online: false, lastSeen: new Date().toISOString() },
        }));
      })
      .subscribe();

    channelsRef.current.push(presenceChannel);

    return () => {
      channelsRef.current.forEach(channel => {
        if (channel && typeof channel.unsubscribe === 'function') {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [supabase, fetchAllUserStatuses]);

  const getUserStatus = useCallback((userId: string): UserStatus => {
    return userStatuses[userId] || { online: false };
  }, [userStatuses]);

  const getAllUserStatuses = useCallback((): Record<string, UserStatus> => {
    return userStatuses;
  }, [userStatuses]);

  return (
    <UserStatusContext.Provider value={{ getUserStatus, getAllUserStatuses, isLoading }}>
      {children}
    </UserStatusContext.Provider>
  );
}
