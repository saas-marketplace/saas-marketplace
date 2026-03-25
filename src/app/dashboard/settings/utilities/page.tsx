"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { withYield, yieldToMain, convertToCSVAsync, createYieldEvery50ms } from "@/lib/yieldToMain";
import { 
  Database, 
  Download, 
  CloudUpload, 
  FileText, 
  Loader2, 
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from "next/link";

interface AuditLogEntry {
  id: string;
  action: string;
  user_id: string;
  user_email: string;
  section: string;
  details: string;
  metadata?: unknown;
  created_at: string;
}

const PAGE_SIZE = 15;
const supabase = createClient();

export default function UtilitiesSettingsPage() {
  const { user, loading: authLoading } = useAuth();

  // ✅ isSuperAdmin from cache — no extra getUser/team_members call
  const isSuperAdmin = !authLoading && (user?.role === "super_admin" || user?.role === "admin");

  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"export" | "import" | "logs">("export");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Resolve loading once auth is ready
  useEffect(() => {
    if (!authLoading) setLoading(false);
  }, [authLoading]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── fetchAuditLogs ────────────────────────────────────────────────────────

  const fetchAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error || !logs) {
        setAuditLogs([]);
        return;
      }

      // ✅ yield before processing the log array (could be 200 rows)
      await yieldToMain();

      const userIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
      let emailMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds);
        emailMap = new Map(users?.map((u: any) => [u.id, u.email]) ?? []);
      }

      // ✅ Map rows with yielding every 50ms for large sets
      const maybeYield = createYieldEvery50ms();
      const mappedLogs: AuditLogEntry[] = [];
      for (const log of logs) {
        mappedLogs.push({
          ...log,
          user_email: emailMap.get(log.user_id) ?? "Unknown",
        });
        await maybeYield();
      }

      setAuditLogs(mappedLogs);
    } catch (err) {
      console.error("[AuditLogs] fetch error:", err);
      setAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Fetch logs when switching to logs tab
  useEffect(() => {
    if (activeTab === "logs" && isSuperAdmin && auditLogs.length === 0) {
      fetchAuditLogs();
    }
  }, [activeTab, isSuperAdmin, auditLogs.length, fetchAuditLogs]);

  // Real-time audit log subscription
  useEffect(() => {
    if (activeTab !== "logs" || !isSuperAdmin) return;
    const channel = supabase
      .channel("audit-logs-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
        fetchAuditLogs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab, isSuperAdmin, fetchAuditLogs]);

  // ── Filtered logs (memoized — no useEffect needed) ────────────────────────

  const { filteredLogs, uniqueActions } = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    const filtered = auditLogs.filter((log) => {
      const matchesSearch =
        !search ||
        log.action.toLowerCase().includes(search) ||
        log.user_email.toLowerCase().includes(search) ||
        log.section.toLowerCase().includes(search) ||
        (log.details && log.details.toLowerCase().includes(search));
      const matchesAction = filterAction === "all" || log.action === filterAction;
      return matchesSearch && matchesAction;
    });
    const actions = [...new Set(auditLogs.map((l) => l.action).filter(Boolean))].sort();
    return { filteredLogs: filtered, uniqueActions: actions };
  }, [auditLogs, debouncedSearch, filterAction]);

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterAction]);

  // ── handleExport ──────────────────────────────────────────────────────────

  const handleExport = async (dataType: string, format: "json" | "csv" = "json") => {
    // ✅ withYield: show loading state first, then yield, then do the heavy work
    await withYield(
      () => { setExporting(true); setMessage(null); },
      async () => {
        try {
          let data: unknown = [];
          let filename = "";

          switch (dataType) {
            case "users": {
              const { data: d } = await supabase.from("users").select("id, email, full_name, role, created_at");
              data = d ?? []; filename = "users-export"; break;
            }
            case "team-members": {
              const { data: d } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
              data = d ?? []; filename = "team-members-export"; break;
            }
            case "requests": {
              const { data: d } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
              data = d ?? []; filename = "requests-export"; break;
            }
            case "products": {
              const { data: d } = await supabase.from("products").select("*").order("created_at", { ascending: false });
              data = d ?? []; filename = "products-export"; break;
            }
            case "blogs": {
              const { data: d } = await supabase.from("blogs").select("*").order("created_at", { ascending: false });
              data = d ?? []; filename = "blogs-export"; break;
            }
            case "full-backup": {
              // ✅ All tables in parallel, then yield before serialization
              const [u, m, r, p, b] = await Promise.all([
                supabase.from("users").select("*"),
                supabase.from("team_members").select("*"),
                supabase.from("contact_submissions").select("*"),
                supabase.from("products").select("*"),
                supabase.from("blogs").select("*"),
              ]);
              data = {
                users: u.data ?? [], team_members: m.data ?? [],
                requests: r.data ?? [], products: p.data ?? [], blogs: b.data ?? [],
              };
              filename = "full-backup"; break;
            }
            default: throw new Error("Invalid data type");
          }

          // ✅ yield before CPU-heavy serialization
          await yieldToMain();

          let blob: Blob;
          let ext: string;

          if (format === "csv" && dataType !== "full-backup" && Array.isArray(data)) {
            // ✅ convertToCSVAsync yields every 50ms inside the loop
            const csvContent = await convertToCSVAsync(data as Record<string, unknown>[]);
            blob = new Blob([csvContent], { type: "text/csv" });
            ext = "csv";
          } else {
            // ✅ yield before JSON.stringify on potentially large objects
            await yieldToMain();
            const jsonString = JSON.stringify(data, null, 2);
            blob = new Blob([jsonString], { type: "application/json" });
            ext = "json";
          }

          // ✅ yield before DOM manipulation + file download trigger
          await yieldToMain();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filename}-${new Date().toISOString().split("T")[0]}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);

          const recordCount = Array.isArray(data)
            ? data.length
            : Object.values(data as Record<string, unknown[]>).reduce(
                (s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0
              );

          setMessage({ type: "success", text: `${dataType} exported successfully (${recordCount} records)` });
        } catch (err) {
          console.error("[Export] error:", err);
          setMessage({ type: "error", text: "Failed to export data" });
        } finally {
          setExporting(false);
        }
      }
    );
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE": return "bg-green-100 text-green-800";
      case "UPDATE": return "bg-blue-100 text-blue-800";
      case "DELETE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(d).toLocaleDateString();
  };

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Link href="/dashboard/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Database className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You must be an Admin to access utilities and logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Utilities &amp; Logs</h1>
        <p className="text-gray-600 mt-1">Export data, import users, and view audit logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        {[
          { id: "export", label: "Export Data", icon: Download },
          { id: "import", label: "Import Users", icon: CloudUpload },
          { id: "logs",   label: "Audit Logs",   icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === id ? "bg-cyan-100 text-cyan-700" : "text-gray-600 hover:bg-gray-100"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === "export" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Export Data</h2>
          <p className="text-gray-600 mb-6">Export your data in JSON or CSV format for backup or migration.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { type: "users",        title: "Users Data",     desc: "Export all user accounts and profiles" },
              { type: "team-members", title: "Team Members",   desc: "Export team members and their permissions" },
              { type: "requests",     title: "Requests",       desc: "Export all client requests" },
              { type: "products",     title: "Products",       desc: "Export all marketplace products" },
              { type: "blogs",        title: "Blog Posts",     desc: "Export all blog posts and comments" },
              { type: "full-backup",  title: "Full Backup",    desc: "Export all data in a single file" },
            ].map(({ type, title, desc }) => (
              <ExportCard key={type} title={title} description={desc} exporting={exporting}
                onExport={(fmt) => handleExport(type, fmt)} />
            ))}
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === "import" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Import Users</h2>
          <p className="text-gray-600 mb-6">Import users from a CSV or JSON file.</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your CSV or JSON file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">Browse Files</button>
            <p className="text-xs text-gray-500 mt-4">Supported formats: CSV, JSON — Max file size: 10MB</p>
          </div>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Import functionality requires proper CSV/JSON parsing and validation.
            </p>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "logs" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Audit Logs</h2>
            <span className="text-sm text-gray-500">{filteredLogs.length} entries</span>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500" />
            </div>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500">
              <option value="all">All Actions</option>
              {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {logsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          )}

          {!logsLoading && filteredLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Action", "User", "Section", "Details", "Date"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{log.user_email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-sm capitalize">{log.section}</span></td>
                        <td className="px-4 py-3"><span className="text-sm text-gray-600">{log.details || "-"}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" /> {formatDate(log.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                    .map((p) => (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 text-sm rounded-lg ${currentPage === p ? "bg-cyan-500 text-white" : "border border-gray-300 hover:bg-gray-50"}`}>
                        {p}
                      </button>
                    ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {!logsLoading && filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportCard({ title, description, onExport, exporting }: {
  title: string; description: string;
  onExport: (f: "json" | "csv") => void; exporting: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors">
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="flex gap-2">
        {(["json", "csv"] as const).map((fmt) => (
          <button key={fmt} onClick={() => onExport(fmt)} disabled={exporting}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${fmt === "csv" ? "bg-cyan-100 hover:bg-cyan-200 text-cyan-700" : "bg-gray-100 hover:bg-gray-200"}`}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {fmt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// Need Upload for import tab
function Upload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}