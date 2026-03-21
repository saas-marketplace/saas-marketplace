"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Trash2, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: {
    id: string;
    sender_id: string;
    message: string;
    created_at: string;
  };
  isUserMsg: boolean;
  currentUserId: string;
  onDelete?: (messageId: string) => void;
  mobile?: boolean;
}

export function MessageBubble({ message, isUserMsg, currentUserId, onDelete, mobile = false }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  // Device detection - check if it's a touch device
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Handle menu position calculation
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTouchDevice) {
      const rect = messageRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          top: rect.bottom + 8,
          left: rect.right - 120, // Account for menu width
        });
      }
      setShowMenu(!showMenu);
    }
  };

  // Handle long press for mobile - show dropdown first
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTouchDevice && canDelete) {
      // Prevent default to avoid scroll conflicts
      e.preventDefault();
      touchStartTimeRef.current = Date.now();
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPress(true);
        // Show dropdown menu on mobile long press instead of direct dialog
        const rect = messageRef.current?.getBoundingClientRect();
        if (rect) {
          // Calculate position - show dropdown above message on mobile if near bottom
          const isNearBottom = rect.bottom > window.innerHeight - 200;
          setMenuPosition({
            top: isNearBottom ? rect.top - 60 : rect.bottom + 8,
            left: Math.max(10, Math.min(rect.right - 140, window.innerWidth - 150)),
          });
        }
        setShowMenu(true);
      }, 500); // 500ms long press threshold
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    // If it was a short tap (< 500ms), don't trigger long press action
    const touchDuration = Date.now() - touchStartTimeRef.current;
    if (touchDuration < 500) {
      setIsLongPress(false);
    }
  };

  // Handle delete action with OPTIMISTIC UI UPDATE
  const handleDelete = async () => {
    // 1. OPTIMISTIC UPDATE: Immediately remove message from UI before API call
    // This makes the deletion feel instant like WhatsApp/Messenger
    onDelete?.(message.id);
    
    setShowDeleteDialog(false);
    setIsDeleting(true);
    
    try {
      // 2. Then delete from database in background
      const supabase = createClient();
      const response = await fetch(`/api/requests/messages?message_id=${message.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to delete message');
        // Note: In a production app, you might want to rollback the optimistic update here
        // For simplicity, we rely on the real-time subscription to eventually sync the state
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      // Note: In a production app, you might want to rollback the optimistic update here
    } finally {
      setIsDeleting(false);
    }
  };

  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Only show menu/delete option for user's own messages
  const canDelete = isUserMsg;

  return (
    <>
      <motion.div
        ref={messageRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: isLongPress ? 0.98 : 1 
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex ${isUserMsg ? "justify-end" : "justify-start"} items-end group`}
        style={{ touchAction: 'none' }}
      >
        {!isUserMsg && (
          <div className={`${mobile ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center mr-2 shrink-0 ${mobile ? '' : 'shadow-md'}`}>
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        
        <div 
          className={`relative max-w-[70%] ${mobile ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-4 py-3'} transition-all duration-200 ${
            isUserMsg
              ? "bg-gradient-to-br from-[#249fd3] to-cyan-500 text-white rounded-br-sm shadow-md"
              : "bg-cyan-50 text-slate-800 rounded-bl-sm border border-cyan-100"
          } ${mobile ? 'sm:max-w-[70%] sm:px-4 sm:py-3' : ''}`}
          style={isUserMsg ? { boxShadow: '0 2px 8px rgba(36, 159, 211, 0.2)' } : undefined}
        >
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
          <div className={`text-right mt-1 ${isUserMsg ? 'text-white/70' : 'text-slate-400'}`}>
            <span className="text-xs">{formatMessageTime(message.created_at)}</span>
          </div>

          {/* Three dots menu button - shown on hover for DESKTOP only (not mobile/tablet) */}
          {canDelete && !isTouchDevice && (
            <button
              onClick={handleMenuClick}
              className={`absolute top-1 ${isUserMsg ? '-left-10' : '-right-8'} p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-cyan-50 transition-all duration-200`}
              aria-label="Message options"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-500" />
            </button>
          )}

          {/* Dropdown menu - shown for both desktop and mobile */}
          {showMenu && menuPosition && (
            <div
              ref={menuRef}
              className="fixed z-50 bg-white rounded-xl shadow-xl border border-cyan-100 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-200"
              style={{ 
                top: menuPosition.top, 
                left: menuPosition.left 
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setShowDeleteDialog(true);
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors rounded-lg mx-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {isUserMsg && <div className={mobile ? 'w-8 shrink-0' : 'w-11 shrink-0'} />}
      </motion.div>

      {/* Delete confirmation dialog - responsive for mobile */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[90vw] max-w-sm sm:max-w-md mx-auto p-4 sm:p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg sm:text-xl">Delete Message</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
