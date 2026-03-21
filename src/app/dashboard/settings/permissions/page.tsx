"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Shield, 
  Loader2, 
  Search, 
  ArrowLeft,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { 
  SECTIONS, 
  PermissionSection, 
  PermissionAction, 
  Permissions,
  PERMISSION_PRESETS,
  PermissionPreset
} from '@/types/permissions';
import { Checkbox } from '@/components/ui/checkbox';

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role_label: string;
  permissions: Permissions;
  status: string;
  avatar_url: string | null;
}

export default function PermissionsSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Current user's role
      const { data: memberData } = await supabase
        .from('team_members')
        .select('role_label')
        .eq('user_id', user.id)
        .maybeSingle();

      const isSuper = memberData?.role_label === 'Super Admin';
      setIsSuperAdmin(isSuper);

      // Get all team members
      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      const userIds = members?.map((m: any) => m.user_id) || [];
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map<string, string>(users?.map((u: any) => [u.id, u.email]) || []);
      const mappedMembers = (members || []).map((member: any) => ({
        ...member,
        email: emailMap.get(member.user_id) || ''
      }));

      setTeamMembers(mappedMembers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deepEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
  const safeLower = (str: string | null | undefined) => (str || '').toLowerCase();

  const handleSavePermissions = async () => {
    if (!selectedMember || selectedMember.role_label === 'Super Admin') return;
    setSaving(true);
    setMessage(null);

    try {
      await supabase
        .from('team_members')
        .update({ permissions: selectedMember.permissions })
        .eq('id', selectedMember.id);

      setTeamMembers(prev => 
        prev.map(m => m.id === selectedMember.id ? selectedMember : m)
      );
      setMessage({ type: 'success', text: 'Permissions saved successfully' });
    } catch (error) {
      console.error('Error saving permissions:', error);
      setMessage({ type: 'error', text: 'Failed to save permissions' });
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (
    section: PermissionSection,
    action: PermissionAction,
    checked: boolean
  ) => {
    if (!selectedMember || selectedMember.role_label === 'Super Admin') return;

    setSelectedMember(prev => {
      if (!prev) return prev;
      const sectionPermissions = prev.permissions[section] || [];
      const newSectionPermissions = checked
        ? [...sectionPermissions, action]
        : sectionPermissions.filter(a => a !== action);

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [section]: newSectionPermissions
        }
      };
    });
  };

  const handlePresetChange = (preset: PermissionPreset) => {
    if (!selectedMember || preset === 'custom' || selectedMember.role_label === 'Super Admin') return;

    setSelectedMember(prev => prev ? { ...prev, permissions: PERMISSION_PRESETS[preset] } : prev);
  };

  const hasPermission = (permissions: Permissions, section: PermissionSection, action: PermissionAction): boolean => {
    return permissions[section]?.includes(action) || false;
  };

  const filteredMembers = teamMembers.filter(member =>
    safeLower(member.display_name).includes(searchQuery.toLowerCase()) ||
    safeLower(member.email).includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Permissions & Access Control</h1>
        <p className="text-gray-600 mt-1">Configure permissions matrix for team members</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members List */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-semibold mb-4">Team Members</h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedMember?.id === member.id 
                      ? 'bg-cyan-50 border border-cyan-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-cyan-600">{getInitials(member.display_name)}</span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.display_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{member.email || 'No Email'}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${
                    member.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {selectedMember ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-semibold text-lg">{selectedMember.display_name || 'Unknown'}</h2>
                    <p className="text-sm text-gray-500">{selectedMember.email || 'No Email'}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                      selectedMember.role_label === 'Super Admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : selectedMember.role_label === 'Admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedMember.role_label}
                    </span>
                  </div>

                  {isSuperAdmin && selectedMember.role_label !== 'Super Admin' && (
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Permissions
                    </button>
                  )}
                </div>

                {selectedMember.role_label === 'Super Admin' ? (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-800">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Super Admin has full access to all sections and actions. Permissions cannot be modified.
                    </p>
                  </div>
                ) : isSuperAdmin ? (
                  <>
                    {/* Presets */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
                      <div className="flex gap-2">
                        {(['read_only', 'write', 'full_access'] as const).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => handlePresetChange(preset)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              deepEqual(selectedMember.permissions, PERMISSION_PRESETS[preset])
                                ? 'bg-cyan-100 border-cyan-300 text-cyan-700'
                                : 'bg-white border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {preset === 'read_only' ? 'Read Only' : preset === 'write' ? 'Write' : 'Full Access'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions Matrix */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-40">Section</th>
                            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                              <Eye className="w-4 h-4 inline mr-1" /> View
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                              <Plus className="w-4 h-4 inline mr-1" /> Create
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                              <Pencil className="w-4 h-4 inline mr-1" /> Update
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                              <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {SECTIONS.filter(s => s.key !== 'dashboard').map((section) => (
                            <tr key={section.key} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{section.label}</p>
                                <p className="text-xs text-gray-500">{section.description}</p>
                              </td>
                              {(['view', 'create', 'update', 'delete'] as PermissionAction[]).map((action) => (
                                <td key={action} className="text-center px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={hasPermission(selectedMember.permissions, section.key, action)}
                                    onChange={(e) => handlePermissionChange(section.key, action, e.target.checked)}
                                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
                                    disabled={!isSuperAdmin}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800">
                      You don't have permission to edit team member permissions. Only Super Admins can modify permissions.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a team member to view and edit their permissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}