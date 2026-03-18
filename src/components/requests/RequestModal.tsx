"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancer?: {
    id: string;
    display_name: string;
    title?: string;
    avatar_url?: string;
  } | null;
  requestType?: "freelancer" | "admin";
  defaultSubject?: string;
}

export function RequestModal({ 
  isOpen, 
  onClose, 
  freelancer, 
  requestType = "freelancer",
  defaultSubject = ""
}: RequestModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setLoading(true);

    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/auth/login?redirect=" + encodeURIComponent(window.location.pathname));
        return;
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancer_id: freelancer?.id || null,
          subject: subject.trim() || null,
          message: message.trim(),
          request_type: requestType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send request");
        return;
      }

      // Success - redirect to user's requests page
      setMessage("");
      setSubject("");
      onClose();
      router.push("/requests");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error sending request:", err);
    } finally {
      setLoading(false);
    }
  };

  const recipientTitle = requestType === "admin" ? "Admin" : freelancer?.display_name || "Freelancer";
  const recipientSubtitle = requestType === "admin" 
    ? "Milit Company Support" 
    : freelancer?.title || "Freelancer";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-cyan-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    {freelancer?.avatar_url ? (
                      <img 
                        src={freelancer.avatar_url} 
                        alt={freelancer.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Contact {recipientTitle}</h2>
                    <p className="text-sm text-slate-500">{recipientSubtitle}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-500 hover:text-[#249fd3] hover:bg-cyan-50">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2 text-slate-700">
                    Subject (optional)
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What is this about?"
                    className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2 text-slate-700">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message here..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200 resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-cyan-200 text-slate-600 hover:bg-cyan-50 hover:text-[#249fd3] hover:border-cyan-300 transition-all duration-200"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading || !message.trim()}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for managing request modal state
export function useRequestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [freelancer, setFreelancer] = useState<RequestModalProps["freelancer"]>(null);
  const [requestType, setRequestType] = useState<"freelancer" | "admin">("freelancer");
  const [defaultSubject, setDefaultSubject] = useState("");

  const openFreelancerRequest = (freelancerData: RequestModalProps["freelancer"]) => {
    setFreelancer(freelancerData);
    setRequestType("freelancer");
    setDefaultSubject("");
    setIsOpen(true);
  };

  const openAdminRequest = (subject: string = "") => {
    setFreelancer(null);
    setRequestType("admin");
    setDefaultSubject(subject);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setFreelancer(null);
    setDefaultSubject("");
  };

  return {
    isOpen,
    freelancer,
    requestType,
    defaultSubject,
    openFreelancerRequest,
    openAdminRequest,
    close,
  };
}
