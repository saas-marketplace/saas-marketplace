"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Database, 
  Download, 
  Upload, 
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
import Link from 'next/link';

interface AuditLogEntry {
  id: string;
  action: string;
  user_id: string;
  user_email: string;
  section: string;
  details: string;
  metadata?: any;
  created_at: string;
}

const PAGE_SIZE = 15;

export default function UtilitiesSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'logs'>('export');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Get unique actions for filter dropdown
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (activeTab !== 'logs' || !isSuperAdmin) return;

    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs'
      }, (payload: any) => {
        console.log('[AuditLogs] New log inserted:', payload);
        // Fetch the new log with user data
        fetchAuditLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, isSuperAdmin]);

  // Filter logs when search or action filter changes
  useEffect(() => {
    let filtered = [...auditLogs];
    
    // Apply search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(search) ||
        log.user_email.toLowerCase().includes(search) ||
        log.section.toLowerCase().includes(search) ||
        (log.details && log.details.toLowerCase().includes(search))
      );
    }
    
    // Apply action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }
    
    setFilteredLogs(filtered);
    setTotalLogs(filtered.length);
    setCurrentPage(1); // Reset to first page on filter change
  }, [auditLogs, debouncedSearch, filterAction]);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if super admin or admin
      const { data: memberData } = await supabase
        .from('team_members')
        .select('role_label')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAdmin = memberData?.role_label === 'Super Admin' || memberData?.role_label === 'Admin';
      
      if (!isAdmin) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      setIsSuperAdmin(true);
      fetchAuditLogs();
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      // Fetch from audit_logs table with user join
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); // Limit for performance

      if (error) {
        console.error('Error fetching logs:', error);
        setAuditLogs([]);
        setFilteredLogs([]);
        setLogsLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(logs?.map((log: any) => log.user_id).filter(Boolean) || [])];
      
      // Fetch user emails
      let emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);
        
        emailMap = new Map<string, string>(users?.map((u: any) => [u.id, u.email]) || []);
      }

      // Map logs with user emails
      const mappedLogs: AuditLogEntry[] = (logs || []).map((log: any) => ({
        ...log,
        user_email: emailMap.get(log.user_id) || 'Unknown'
      }));

      // Get unique actions for filter
      const actions = [...new Set(mappedLogs.map(log => log.action).filter(Boolean))];
      setUniqueActions(actions.sort());

      setAuditLogs(mappedLogs);
      setFilteredLogs(mappedLogs);
      setTotalLogs(mappedLogs.length);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setAuditLogs([]);
      setFilteredLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleExport = async (dataType: string, format: 'json' | 'csv' = 'json') => {
    setExporting(true);
    setMessage(null);

    try {
      let data: any = [];
      let filename = '';

      // Fetch actual data based on type
      switch (dataType) {
        case 'users':
          const { data: users } = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at');
          data = users || [];
          filename = 'users-export';
          break;
        case 'team-members':
          const { data: members } = await supabase
            .from('team_members')
            .select('*')
            .order('created_at', { ascending: false });
          data = members || [];
          filename = 'team-members-export';
          break;
        case 'requests':
          const { data: requests } = await supabase
            .from('contact_submissions')
            .select('*')
            .order('created_at', { ascending: false });
          data = requests || [];
          filename = 'requests-export';
          break;
        case 'products':
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
          data = products || [];
          filename = 'products-export';
          break;
        case 'blogs':
          const { data: blogs } = await supabase
            .from('blogs')
            .select('*')
            .order('created_at', { ascending: false });
          data = blogs || [];
          filename = 'blogs-export';
          break;
        case 'full-backup':
          // Export all data
          const [usersRes, membersRes, requestsRes, productsRes, blogsRes] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('team_members').select('*'),
            supabase.from('contact_submissions').select('*'),
            supabase.from('products').select('*'),
            supabase.from('blogs').select('*')
          ]);
          data = {
            users: usersRes.data || [],
            team_members: membersRes.data || [],
            requests: requestsRes.data || [],
            products: productsRes.data || [],
            blogs: blogsRes.data || []
          };
          filename = 'full-backup';
          break;
        default:
          throw new Error('Invalid data type');
      }

      // Create downloadable file
      let blob: Blob;
      let fileExtension: string;

      if (format === 'csv' && dataType !== 'full-backup') {
        // Convert to CSV
        const csvContent = convertToCSV(data);
        blob = new Blob([csvContent], { type: 'text/csv' });
        fileExtension = 'csv';
      } else {
        // JSON format
        const jsonString = JSON.stringify(data, null, 2);
        blob = new Blob([jsonString], { type: 'application/json' });
        fileExtension = 'json';
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      a.click();
      URL.revokeObjectURL(url);

      const recordCount = Array.isArray(data) ? data.length : Object.values(data as Record<string, any[]>).reduce((sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      setMessage({ type: 'success', text: `${dataType} data exported successfully (${recordCount} records)` });
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setExporting(false);
    }
  };

  // Helper function to convert array of objects to CSV
  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma or quote
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  // Computed filtered logs removed - now handled by useEffect

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

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
        <div className="mb-6">
          <Link 
            href="/dashboard/settings" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>
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
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Utilities & Logs</h1>
        <p className="text-gray-600 mt-1">Export data, import users, and view audit logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        {[
          { id: 'export', label: 'Export Data', icon: Download },
          { id: 'import', label: 'Import Users', icon: Upload },
          { id: 'logs', label: 'Audit Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'bg-cyan-100 text-cyan-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Export Data</h2>
          <p className="text-gray-600 mb-6">Export your data in JSON format for backup or migration purposes.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExportCard
              title="Users Data"
              description="Export all user accounts and profiles"
              onExport={(format) => handleExport('users', format)}
              exporting={exporting}
            />
            <ExportCard
              title="Team Members"
              description="Export team members and their permissions"
              onExport={(format) => handleExport('team-members', format)}
              exporting={exporting}
            />
            <ExportCard
              title="Requests"
              description="Export all client requests"
              onExport={(format) => handleExport('requests', format)}
              exporting={exporting}
            />
            <ExportCard
              title="Products"
              description="Export all marketplace products"
              onExport={(format) => handleExport('products', format)}
              exporting={exporting}
            />
            <ExportCard
              title="Blog Posts"
              description="Export all blog posts and comments"
              onExport={(format) => handleExport('blogs', format)}
              exporting={exporting}
            />
            <ExportCard
              title="Full Backup"
              description="Export all data in a single file"
              onExport={(format) => handleExport('full-backup', format)}
              exporting={exporting}
            />
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Import Users</h2>
          <p className="text-gray-600 mb-6">Import users from a CSV or JSON file.</p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your CSV or JSON file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
              Browse Files
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Supported formats: CSV, JSON<br />
              Max file size: 10MB
            </p>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Import functionality requires proper CSV/JSON parsing and validation. 
              Contact your developer to complete the implementation.
            </p>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Audit Logs</h2>
            <span className="text-sm text-gray-500">{totalLogs} entries</span>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Loading State */}
          {logsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          )}

          {/* Logs Table */}
          {!logsLoading && filteredLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Section</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs
                      .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                      .map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{log.user_email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm capitalize">{log.section}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{log.details || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalLogs)} of {totalLogs} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(totalLogs / PAGE_SIZE) }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(totalLogs / PAGE_SIZE), currentPage + 2))
                      .map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm rounded-lg ${
                          currentPage === page
                            ? 'bg-cyan-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalLogs / PAGE_SIZE), p + 1))}
                    disabled={currentPage >= Math.ceil(totalLogs / PAGE_SIZE)}
                    className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
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

// Export Card Component
function ExportCard({
  title,
  description,
  onExport,
  exporting
}: {
  title: string;
  description: string;
  onExport: (format: 'json' | 'csv') => void;
  exporting: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors">
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onExport('json')}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          JSON
        </button>
        <button
          onClick={() => onExport('csv')}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          CSV
        </button>
      </div>
    </div>
  );
}
