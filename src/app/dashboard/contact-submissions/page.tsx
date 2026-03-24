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
  XCircle
} from "lucide-react";
import { usePermissions } from "@/stores/permissions-context";
import { SectionAccessGuard } from "@/components/ui/section-access-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
                        {submission.is_read ? (
                          <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 w-fit">
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
                          {submission.is_read ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(submission.id, "read")}
                              disabled={updating === submission.id}
                              title="Mark as read"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(submission.id, "unread")}
                              disabled={updating === submission.id}
                              title="Mark as unread"
                            >
                              <XCircle className="w-4 h-4" />
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
    </SectionAccessGuard>
  );
}
