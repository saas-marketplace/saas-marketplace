"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  UserCog, 
  Search, 
  Ban, 
  Undo2, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  UserX,
  UserCheck
} from "lucide-react";
import { usePermissions } from "@/stores/permissions-context";
import { useAuth } from "@/components/providers/auth-provider";
import { SectionAccessGuard } from "@/components/ui/section-access-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  is_banned: boolean;
  banned_ip: string | null;
}

export default function UsersManagementPage() {
  const { isLoading: permsLoading, isSuperAdmin, canAccessSection } = usePermissions();
  const { user, loading: sessionLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [banning, setBanning] = useState<string | null>(null);
  const limit = 10;

  const supabase = createClient();

  // Check access
  const isLoading = permsLoading || sessionLoading;

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = `/api/users?page=${page}&limit=${limit}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setBannedCount(data.banned || 0);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch users",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Initial fetch
  useEffect(() => {
    if (!isLoading && isSuperAdmin && canAccessSection("users")) {
      fetchUsers();
    }
  }, [isLoading, isSuperAdmin, canAccessSection("users"), fetchUsers]);

  // Search with debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const timeout = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Handle ban/unban
  const handleBanUser = async (userId: string, action: "ban" | "unban") => {
    setBanning(userId);
    try {
      // Get client IP
      let clientIp = "unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch (e) {
        console.log("Could not get IP:", e);
      }

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          action,
          banned_ip: clientIp
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: action === "ban" ? "User Banned" : "User Unbanned",
          description: data.message,
        });
        fetchUsers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update user",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error banning/unbanning user:", err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setBanning(null);
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
  if (!isLoading && !canAccessSection("users")) {
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
    <SectionAccessGuard section="users">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCog className="w-6 h-6" />
              Users Management
            </h1>
            <p className="text-slate-500 mt-1">
              Manage platform users (role: user only)
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Total Users: {total}</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Banned: {bannedCount}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created At</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{user.full_name || "N/A"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_banned ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <UserX className="w-3 h-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 w-fit">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {banning === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                        ) : user.is_banned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBanUser(user.id, "unban")}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Undo2 className="w-4 h-4 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBanUser(user.id, "ban")}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </Button>
                        )}
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
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
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
