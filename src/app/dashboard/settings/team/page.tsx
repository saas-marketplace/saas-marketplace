"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, 
  Loader2, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  UserMinus,
  UserPlus,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/stores/permissions-context';
import { ROLE_LABELS, Permissions, PERMISSION_PRESETS, hasPermission, arrayToBoolean } from '@/types/permissions';

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role_label: string;
  permissions: Permissions;
  is_active: boolean;
  status: string;
  avatar_url: string | null;
  created_at: string;
}

export default function TeamSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const permissionsCtx = usePermissions();
  const userForPerm = {
    role: permissionsCtx.isSuperAdmin ? 'super_admin' : 'admin',
    permissions: arrayToBoolean(permissionsCtx.permissions)
  };
  const canManageTeam = hasPermission(userForPerm, 'manage_team');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'team_member'>('team_member');
  const [invitePermissions, setInvitePermissions] = useState<Permissions>(PERMISSION_PRESETS.write);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      // Get all team members
      const { data: members, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails from users table
      const userIds = members?.map((m: any) => m.user_id) || [];
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map<string, string>(users?.map((u: any) => [u.id, u.email]) || []);

      const mappedMembers = (members || []).map((member: any) => ({
        ...member,
        email: emailMap.get(member.user_id) || '',
        // Map is_active boolean to status string for the UI
        // Explicitly check for true - anything else (false/null/undefined) is suspended
        status: member.is_active === true ? 'active' : 'suspended'
      }));

      setTeamMembers(mappedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    if (!inviteEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .maybeSingle();

      if (existingUser) {
        // Check if already a team member
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (existingMember) {
          setMessage({ type: 'error', text: 'This user is already a team member' });
          setSending(false);
          return;
        }

        // Add existing user to team
        await supabase.from('team_members').insert({
          user_id: existingUser.id,
          display_name: inviteEmail.split('@')[0],
          role_label: inviteRole === 'admin' ? 'Admin' : 'Team Member',
          permissions: invitePermissions,
          is_active: true,
          needs_access_restored: true  // Flag triggers access-restored page for the user
        });

        setMessage({ type: 'success', text: 'Team member added successfully' });
      } else {
        // For new users, we'd typically send an invitation email
        // For now, we'll just show a success message
        setMessage({ type: 'success', text: 'Invitation sent! (Email invitations require SMTP setup)' });
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('team_member');
      setInvitePermissions(PERMISSION_PRESETS.write);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      setMessage({ type: 'error', text: 'Failed to invite team member' });
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (memberId: string, newStatus: 'active' | 'suspended') => {
    try {
      // Update is_active boolean in the database (maps to status in UI)
      // When reactivating, also set needs_access_restored so user sees /access-restored page
      const isActive = newStatus === 'active';
      const updateData = isActive 
        ? { is_active: true, needs_access_restored: true }  // reactivate → flag triggers access-restored
        : { is_active: false };  // suspend

      await supabase
        .from('team_members')
        .update(updateData)
        .eq('id', memberId);

      setTeamMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, status: newStatus } : m)
      );
      setMessage({ type: 'success', text: `Member ${newStatus === 'active' ? 'activated' : 'suspended'} successfully` });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ type: 'error', text: 'Failed to update member status' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      setMessage({ type: 'success', text: 'Team member removed successfully' });
    } catch (error) {
      console.error('Error removing member:', error);
      setMessage({ type: 'error', text: 'Failed to remove team member' });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string, newPermissions: Permissions) => {
    try {
      await supabase
        .from('team_members')
        .update({ 
          role_label: newRole,
          permissions: newPermissions
        })
        .eq('id', memberId);

      setTeamMembers(prev => 
        prev.map(m => m.id === memberId ? { 
          ...m, 
          role_label: newRole,
          permissions: newPermissions
        } : m)
      );
      setShowEditModal(false);
      setSelectedMember(null);
      setMessage({ type: 'success', text: 'Member role updated successfully' });
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'Failed to update member role' });
    }
  };

  const filteredMembers = teamMembers.filter(member => 
    member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">Manage team members, roles, and permissions</p>
          </div>
          {canManageTeam ?
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button> : null
          }
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search team members..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Team Members List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-cyan-600">{getInitials(member.display_name)}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.display_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.role_label === 'Super Admin' 
                      ? 'bg-purple-100 text-purple-800'
                      : member.role_label === 'Admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role_label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {member.status === 'active' ? (
                      <><Check className="w-3 h-3" /> Active</>
                    ) : (
                      <><X className="w-3 h-3" /> Suspended</>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
{canManageTeam ? 
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedMember(member);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Role & Permissions
                          </DropdownMenuItem> : null
                        }
                        <DropdownMenuItem 
                          onClick={() => handleUpdateStatus(
                            member.id, 
                            member.status === 'active' ? 'suspended' : 'active'
                          )}
                        >
                          {member.status === 'active' ? (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Suspend Member
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Reactivate Member
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No team members found</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="colleague@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'team_member')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="team_member">Team Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMember(null);
          }}
          onSave={(role, permissions) => handleUpdateRole(selectedMember.id, role, permissions)}
        />
      )}
    </div>
  );
}

// Edit Member Modal Component
function EditMemberModal({ 
  member, 
  onClose, 
  onSave 
}: { 
  member: TeamMember; 
  onClose: () => void;
  onSave: (role: string, permissions: Permissions) => void;
}) {
  const [role, setRole] = useState(member.role_label);
  const [permissions, setPermissions] = useState<Permissions>(member.permissions || {});

  const handleSave = () => {
    onSave(role, permissions);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Member: {member.display_name}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              {ROLE_LABELS.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              {['domains', 'freelancers', 'products', 'blogs', 'requests', 'team'].map((section) => (
                <div key={section} className="flex items-center gap-4">
                  <span className="w-24 text-sm capitalize">{section}</span>
                  <div className="flex gap-2">
                    {['view', 'create', 'update', 'delete'].map((action) => (
                      <label key={action} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={permissions[section as keyof Permissions]?.includes(action as any) || false}
                          onChange={(e) => {
                            const current = permissions[section as keyof Permissions] || [];
                            if (e.target.checked) {
                              setPermissions({
                                ...permissions,
                                [section]: [...current, action]
                              });
                            } else {
                              setPermissions({
                                ...permissions,
                                [section]: current.filter((a: any) => a !== action)
                              });
                            }
                          }}
                          className="rounded text-cyan-500"
                        />
                        <span className="capitalize">{action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
