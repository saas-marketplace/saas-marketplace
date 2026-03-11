"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Mail, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const supabase = createClient();

type ClientRequest = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  domain_needed: string;
  project_description: string;
  budget: number;
  deadline?: string;
  status: string;
  created_at?: string;
};

export default function ClientRequestsTable() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('client_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('client_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setRequests((prev) => 
        prev.map((req) => 
          req.id === id ? { ...req, status: newStatus } : req
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'contacted':
        return <Badge variant="default" className="flex items-center gap-1 bg-blue-500"><Mail className="w-3 h-3" /> Contacted</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="flex items-center gap-1 bg-yellow-500"><Clock className="w-3 h-3" /> In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(budget);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No client requests yet.</p>
        <p className="text-sm">Client requests will appear here when submitted.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left py-3 px-4 font-medium">Client Name</th>
            <th className="text-left py-3 px-4 font-medium">Email</th>
            <th className="text-left py-3 px-4 font-medium">Domain Requested</th>
            <th className="text-left py-3 px-4 font-medium">Budget</th>
            <th className="text-left py-3 px-4 font-medium">Deadline</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="text-left py-3 px-4 font-medium">Date</th>
            <th className="text-right py-3 px-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b">
              <td className="py-3 px-4 font-medium">{request.name}</td>
              <td className="py-3 px-4">
                <a 
                  href={`mailto:${request.email}`} 
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="w-3 h-3" />
                  {request.email}
                </a>
              </td>
              <td className="py-3 px-4">{request.domain_needed}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                  {formatBudget(request.budget)}
                </div>
              </td>
              <td className="py-3 px-4">
                {request.deadline ? (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {formatDate(request.deadline)}
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td className="py-3 px-4">
                {getStatusBadge(request.status)}
              </td>
              <td className="py-3 px-4 text-muted-foreground text-sm">
                {formatDate(request.created_at)}
              </td>
              <td className="py-3 px-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={updating === request.id}>
                      {updating === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleUpdateStatus(request.id, 'pending')}
                      disabled={request.status === 'pending'}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleUpdateStatus(request.id, 'contacted')}
                      disabled={request.status === 'contacted'}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Mark as Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                      disabled={request.status === 'in_progress'}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Mark as In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleUpdateStatus(request.id, 'completed')}
                      disabled={request.status === 'completed'}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleUpdateStatus(request.id, 'cancelled')}
                      disabled={request.status === 'cancelled'}
                      className="text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Mark as Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
