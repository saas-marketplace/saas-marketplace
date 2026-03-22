"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { TeamMember } from '@/types/index';
import { Permissions, SECTIONS } from '@/types/permissions';
import TeamMemberDialog from '@/components/dashboard/team/TeamMemberDialog';
import TeamMemberDetails from '@/components/dashboard/team/TeamMemberDetails';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage, LetterAvatar } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Eye,
  UsersRound,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function TeamPage() {
  // Get all access control state FIRST
  const { isLoading, isRemoved, isSuspended, canAccessSection, canCreate, canUpdate, canDelete, isSuperAdmin } = useAccessControl();
  const { toast } = useToast();
  const supabase = createClient();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  // Details popup state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Handle row click - open details popup
  const handleRowClick = (member: TeamMember) => {
    setSelectedMember(member);
    setDetailsOpen(true);
  };
  // Removed duplicate isSuperAdmin - using useAccessControl

  // ── DATA FETCHING FUNCTIONS (defined before useEffect for correct hook order) ──
  const fetchCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role from database:', error);
      }

      const userRole = data?.role || null;
      console.log('User role fetched:', userRole, 'for user ID:', user.id);
      setCurrentUserRole(userRole);
      // isSuperAdmin now from useAccessControl
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*, avatar_url')
        .order('created_at', { ascending: false });

      console.log('Team members query result:', { membersData, membersError });

      if (membersError) throw membersError;

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((m: { user_id: string }) => m.user_id);

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds);

        if (usersError) throw usersError;

        const mergedData = membersData.map((member: TeamMember & { user_id: string }) => ({
          ...member,
          user: (usersData as any[])?.find((u: any) => u.id === member.user_id) || null,
        }));

        setTeamMembers(mergedData);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── EFFECTS (must be called before early returns for consistent hook count) ──
  useEffect(() => {
    fetchCurrentUserRole();
  }, []);

  useEffect(() => {
    if (currentUserRole) {
      fetchTeamMembers();
    }
  }, [currentUserRole]);

  // ALL hooks must be called before any early returns
  // Handle loading state FIRST - always let hooks run
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Handle removed/suspended states
  if (isRemoved) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Access Removed
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          Your access to this application has been removed. Please contact the administrator.
        </p>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Account Suspended
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          Your account is currently suspended. Please contact the administrator.
        </p>
      </div>
    );
  }

  // Access control check - after loading states are handled
  if (!canAccessSection('team')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          You don't have permission to view this section. Contact your administrator for access.
        </p>
      </div>
    );
  }

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to remove ${member.display_name} from the team?`)) {
      return;
    }

    try {
      // Revert the user's role back to 'user'
      await supabase
        .from('users')
        .update({ role: 'user' })
        .eq('id', member.user_id);

      // Delete the team member record
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });

      fetchTeamMembers();
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    // true  → we are about to deactivate (suspend)
    // false → we are about to reactivate
    const isDeactivating = member.is_active;

    try {
      // All access state lives on team_members only — never touch users.role
      // or any column that doesn't exist on the users table.
      const teamMemberUpdate = isDeactivating
        ? { is_active: false }                               // suspend
        : { is_active: true, needs_access_restored: true }; // reactivate → flag triggers /access-restored

      const { error } = await supabase
        .from('team_members')
        .update(teamMemberUpdate)
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Team member ${isDeactivating ? 'deactivated' : 'activated'} successfully`,
      });

      fetchTeamMembers();
    } catch (error) {
      console.error('Error toggling team member status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team member status',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getPermissionsSummary = (permissions: Permissions): string => {
    const sections = Object.keys(permissions).filter(
      key => !!(permissions[key as keyof Permissions]?.length)
    );

    if (sections.length === 0) return 'No permissions';

    const summary = sections.map(section => {
      const sectionKey = section as keyof Permissions;
      const actions = permissions[sectionKey] || [];
      const readableSection = section.charAt(0).toUpperCase() + section.slice(1);
      return `${readableSection}: ${actions.join(', ')}`;
    });

    return summary.slice(0, 2).join(' | ') + (summary.length > 2 ? ' ...' : '');
  };

  // Only super admin can access this page - use isSuperAdmin from hook (set after loading)
  // This check is redundant with canAccessSection but kept for explicit super_admin requirement
  // Note: We use isSuperAdmin state from useAccessControl which is more reliable than currentUserRole

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500">
            Manage team members and their permissions
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => {
              setEditingMember(null);
              setDialogOpen(true);
            }}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Inactive Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => !m.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="w-5 h-5" />
            All Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <UsersRound className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No team members yet
              </h3>
              <p className="text-slate-500 mb-4">
                Add team members to give them admin access with custom permissions
              </p>
              {isSuperAdmin && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow 
                    key={member.id}
                    className="cursor-pointer hover:bg-cyan-50/50 transition-colors"
                    onClick={() => handleRowClick(member)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <Avatar>
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>
                              {getInitials(member.user?.full_name || null, member.user?.email || '')}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <LetterAvatar
                            name={member.user?.full_name || member.display_name || undefined}
                            email={member.user?.email || ''}
                            size="default"
                          />
                        )}
                        <div>
                          <div className="font-medium">{member.display_name}</div>
                          <div className="text-sm text-slate-500">
                            {member.user?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-cyan-100 text-cyan-700">
                        <Shield className="w-3 h-3 mr-1" />
                        {member.role_label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600 max-w-xs truncate" title={getPermissionsSummary(member.permissions)}>
                        {getPermissionsSummary(member.permissions)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? 'default' : 'outline'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(member);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActive(member);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {member.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(member);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <TeamMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingMember={editingMember}
        onSuccess={fetchTeamMembers}
      />

      {/* Team Member Details Popup */}
      <TeamMemberDetails
        member={selectedMember}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}