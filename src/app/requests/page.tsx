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
  Loader2
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Request {
  id: string;
  user_id: string;
  title: string | null;
  status: "pending" | "received" | "answered";
  created_at: string;
}

interface RequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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
          setRequests(data);
        }
      }
      setLoading(false);
    };

    fetchRequests();
  }, [supabase]);

  // Fetch messages when a request is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedRequest) return;
      
      setMessagesLoading(true);
      try {
        const response = await fetch(`/api/requests/messages?request_id=${selectedRequest.id}`);
        const data = await response.json();
        
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [selectedRequest?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;
    
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
        // Append new message to UI - no page reload
        setMessages(prev => [...prev, data.message]);
        setNewMessage("");
        
        // Update request status locally
        setRequests(prev => 
          prev.map(r => 
            r.id === selectedRequest.id 
              ? { ...r, status: "received" as const }
              : r
          )
        );
        setSelectedRequest(prev => 
          prev ? { ...prev, status: "received" as const } : null
        );
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
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
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
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Received</Badge>;
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

  // Check if message is from current user
  const isCurrentUserMessage = (senderId: string): boolean => {
    return currentUserId === senderId;
  };

  // Chat view component
  if (selectedRequest) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-[calc(100vh-200px)] flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedRequest(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold">
                Milit Company Support
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(selectedRequest.created_at)}
              </p>
            </div>
            {getStatusBadge(selectedRequest.status)}
          </div>

          {/* Subject */}
          {selectedRequest.title && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">{selectedRequest.title}</p>
            </div>
          )}

          {/* Messages - using column-reverse for Instagram/Messenger style */}
          <div className="flex-1 overflow-y-auto flex flex-col-reverse gap-4 mb-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                <div ref={messagesEndRef} />
                {messages.map((msg) => {
                  const isUserMsg = isCurrentUserMessage(msg.sender_id);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isUserMsg ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-2xl p-4 ${
                          isUserMsg
                            ? "bg-primary text-primary-foreground"
                            : "bg-cyan-500 text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {isUserMsg ? "You" : "Admin"}
                          </span>
                          <span className="text-xs opacity-70">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={sendingMessage}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="gradient-bg"
            >
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-muted-foreground">
          View your messages to Milit Company
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
          <p className="text-muted-foreground mb-4">
            Contact Milit Company to start a conversation
          </p>
          <Button variant="outline" asChild>
            <a href="/contact">Contact Us</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request, index) => (
            <ScrollReveal key={request.id} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-card rounded-xl border border-border p-6 cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        Milit Company Support
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {request.title && (
                  <div className="mb-3">
                    <p className="font-medium">{request.title}</p>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Click to view conversation...
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="text-sm text-muted-foreground">
                      {request.status === "pending" && "Waiting for response"}
                      {request.status === "received" && "Received response"}
                      {request.status === "answered" && "Answered"}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
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
