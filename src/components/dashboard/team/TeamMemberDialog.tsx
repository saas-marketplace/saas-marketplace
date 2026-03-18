"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TeamMember } from '@/types/index';
import { Permissions, ROLE_LABELS, PERMISSION_PRESETS } from '@/types/permissions';
import PermissionsSelector from '../permissions/PermissionsSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Plus, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMember?: TeamMember | null;
  onSuccess: () => void;
}

export default function TeamMemberDialog({ 
  open, 
  onOpenChange, 
  editingMember,
  onSuccess 
}: TeamMemberDialogProps) {
  const { toast } = useToast();
  const supabase = createClient();
  
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  // Default to read_only permissions for new team members
  const [permissions, setPermissions] = useState<Permissions>(PERMISSION_PRESETS.read_only);

  // Reset form when dialog opens/closes or editing member changes
  useEffect(() => {
    if (open) {
      if (editingMember) {
        setSelectedUserId(editingMember.user_id);
        setDisplayName(editingMember.display_name);
        setRoleLabel(editingMember.role_label);
        setPermissions(editingMember.permissions);
      } else {
        setSelectedUserId('');
        setDisplayName('');
        setRoleLabel('');
        setPermissions({});
      }
    }
  }, [open, editingMember]);

  // Fetch available users (not already team members)
  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open]);

  const fetchAvailableUsers = async () => {
    setUsersLoading(true);
    try {
      // Get all users who are not already team members
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id');
      
      const excludedUserIds = teamMembers?.map(tm => tm.user_id) || [];
      
      // If editing, don't exclude the current member's user_id
      if (editingMember) {
        const index = excludedUserIds.indexOf(editingMember.user_id);
        if (index > -1) {
          excludedUserIds.splice(index, 1);
        }
      }

      let query = supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .order('full_name', { ascending: true });

      if (excludedUserIds.length > 0) {
        query = query.not('id', 'in', `(${excludedUserIds.join(',')})`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser && !displayName) {
      setDisplayName(selectedUser.full_name || selectedUser.email.split('@')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId || !displayName || !roleLabel) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user (the super admin adding this member)
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (editingMember) {
        // Update existing team member
        console.log('[TeamMemberDialog] Updating member with permissions:', permissions);
        
        const { error } = await supabase
          .from('team_members')
          .update({
            display_name: displayName,
            role_label: roleLabel,
            permissions: permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMember.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Team member updated successfully',
        });
      } else {
        // Create new team member
        console.log('[TeamMemberDialog] Creating new member with permissions:', permissions);
        
        // First, update the user's role to 'admin'
        const { error: userError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', selectedUserId);

        if (userError) throw userError;

        // Then create the team member record
        const { error } = await supabase
          .from('team_members')
          .insert({
            user_id: selectedUserId,
            display_name: displayName,
            role_label: roleLabel,
            permissions: permissions,
            created_by: currentUser?.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Team member added successfully. They now have admin access.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMember ? 'Edit Team Member' : 'Add Team Member'}
          </DialogTitle>
          <DialogDescription>
            {editingMember 
              ? 'Update the team member\'s details and permissions'
              : 'Select a user and assign permissions to create a new admin'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Selection (only for new members) */}
          {!editingMember && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User *</Label>
              <Select 
                value={selectedUserId} 
                onValueChange={handleUserSelect}
                disabled={loading}
              >
                <SelectTrigger id="user-select">
                  <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a user"} />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading users...
                    </div>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.full_name || user.email}</span>
                          <span className="text-slate-400 text-sm">({user.email})</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      No users available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name *</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              disabled={loading}
            />
          </div>

          {/* Role Label */}
          <div className="space-y-2">
            <Label htmlFor="role-label">Role Label *</Label>
            <Select 
              value={roleLabel} 
              onValueChange={setRoleLabel}
              disabled={loading}
            >
              <SelectTrigger id="role-label">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_LABELS.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <span className="flex items-center gap-2">
                    <Plus className="w-3 h-3" />
                    Custom...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {roleLabel === 'custom' && (
              <Input
                className="mt-2"
                placeholder="Enter custom role name"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                disabled={loading}
              />
            )}
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <Label>Permissions *</Label>
            <PermissionsSelector
              permissions={permissions}
              onChange={setPermissions}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !selectedUserId || !displayName || !roleLabel}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingMember ? 'Update' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
