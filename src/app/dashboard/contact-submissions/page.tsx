"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Mail, 
  Search, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  MailX,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  Check
} from "lucide-react";
import { usePermissions } from '@/stores/permissions-context';
import { SectionAccessGuard } from "@/components/ui/section-access-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  phone: string | null;
  message: string;
  is_read: boolean;
  is_responded: boolean;
  responded_at: string | null;
  created_at: string;
}

export default function ContactSubmissionsPage() {
  const { isLoading: permsLoading, isSuperAdmin, canAccessSection } = usePermissions();

  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "read" | "unread">("all");
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Modal state
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState(false);
  
  const limit = 10;

  const supabase = createClient();

  const isLoading = permsLoading;

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = `/api/contact-submissions?page=${page}&limit=${limit}`;
      if (filterStatus !== "all") {
        url += `&is_read=${filterStatus === "unread" ? "false" : "true"}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setSubmissions(data.submissions || []);
        setTotal(data.total || 0);
        setUnreadCount(data.unread || 0);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch submissions",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  // Initial fetch
  useEffect(() => {
    if (!isLoading && isSuperAdmin && canAccessSection("contact_submissions")) {
      fetchSubmissions();
    }
  }, [isLoading, isSuperAdmin, canAccessSection("contact_submissions"), fetchSubmissions]);

  // Handle status update
  const handleUpdateStatus = async (submissionId: string, status: "read" | "unread") => {
    setUpdating(submissionId);
    try {
      const response = await fetch("/api/contact-submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          action: "update_status",
          status
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: `Marked as ${status}`,
        });
        fetchSubmissions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  // Handle delete
  const handleDelete = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    
    setUpdating(submissionId);
    try {
      const response = await fetch("/api/contact-submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          action: "delete"
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Deleted",
          description: "Submission deleted successfully",
        });
        fetchSubmissions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete submission",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error deleting submission:", err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  // Open respond modal
  const openRespondModal = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setResponseText("");
    setResponseSuccess(false);
    setRespondModalOpen(true);
  };

  // Handle send response
  const handleSendResponse = async () => {
    if (!selectedSubmission || !responseText.trim()) return;
    
    setSendingResponse(true);
    try {
      const response = await fetch("/api/contact-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: selectedSubmission.id,
          action: "send_response",
          response: responseText.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResponseSuccess(true);
        toast({
          title: "Response Sent",
          description: `Email sent to ${selectedSubmission.email}`,
        });
        // Refresh the list after a short delay
        setTimeout(() => {
          fetchSubmissions();
        }, 1500);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send response",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error sending response:", err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSendingResponse(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Access check
  if (!isLoading && !canAccessSection("contact_submissions")) {
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

  // Loading state
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <SectionAccessGuard section="contact_submissions">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Contact Submissions
            </h1>
            <p className="text-slate-500 mt-1">
              View and manage contact form submissions
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Total: {total}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <MailX className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Unread: {unreadCount}</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterStatus("all"); setPage(1); }}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterStatus("unread"); setPage(1); }}
          >
            Unread
          </Button>
          <Button
            variant={filterStatus === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilterStatus("read"); setPage(1); }}
          >
            Read
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No contact submissions
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <motion.tr
                      key={submission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{submission.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {submission.email}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {submission.subject || "No subject"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs">
                        <p className="truncate">{submission.message}</p>
                      </td>
                      <td className="px-4 py-3">
                        {submission.is_responded ? (
                          <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 w-fit">
                            <Check className="w-3 h-3" />
                            Responded
                          </Badge>
                        ) : submission.is_read ? (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 w-fit">
                            <MailOpen className="w-3 h-3" />
                            Read
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <MailX className="w-3 h-3" />
                            Unread
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          {submission.is_responded ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRespondModal(submission)}
                              disabled={updating === submission.id}
                              title="View response"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openRespondModal(submission)}
                              disabled={updating === submission.id}
                              className="bg-cyan-600 hover:bg-cyan-700"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Respond
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(submission.id)}
                            disabled={updating === submission.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} submissions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Respond Modal */}
      <Dialog open={respondModalOpen} onOpenChange={setRespondModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Respond to Contact Submission</DialogTitle>
            <DialogDescription>
              Send a response to the contact inquiry
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Contact Info - Read Only */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3 flex-shrink-0">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span>
                    <p className="font-medium">{selectedSubmission.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium">{selectedSubmission.email}</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-sm">Original Message:</span>
                  <div className="mt-1 p-3 bg-white dark:bg-slate-900 rounded border text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </div>
                </div>
              </div>

              {/* Response Form */}
              {responseSuccess ? (
                <div className="text-center py-8 flex-shrink-0">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Response Sent Successfully!</h3>
                  <p className="text-slate-500 mb-4">
                    Your response has been sent to {selectedSubmission.email}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRespondModalOpen(false);
                      fetchSubmissions();
                    }}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 flex-shrink-0">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Your Response
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response here..."
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none max-h-48 overflow-y-auto"
                    />
                  </div>

                  <DialogFooter className="flex-shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => setRespondModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendResponse}
                      disabled={!responseText.trim() || sendingResponse}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      {sendingResponse ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Response
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SectionAccessGuard>
  );
}
