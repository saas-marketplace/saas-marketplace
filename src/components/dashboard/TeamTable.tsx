"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LetterAvatar } from '@/components/ui/avatar';
import { MoreHorizontal } from 'lucide-react';

const supabase = createClient();

type TeamMember = {
  id: string;
  display_name: string;
  role_label: string;
  is_active: boolean;
  permissions: Record<string, string[]>;
  avatar_url?: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

interface TeamTableProps {
  members: TeamMember[];
  onEdit?: (member: TeamMember) => void;
  onDelete?: (memberId: string) => void;
  onToggleActive?: (memberId: string, isActive: boolean) => void;
}

export default function TeamTable({ members, onEdit, onDelete, onToggleActive }: TeamTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Member</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Role</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Permissions</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name || 'Team member'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <LetterAvatar
                      name={member.display_name || member.user?.full_name || undefined}
                      email={member.user?.email || ''}
                      size="default"
                      className="h-10 w-10"
                    />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{member.display_name || member.user?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-slate-500">{member.user?.email || 'No email'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-slate-700">{member.role_label || 'Member'}</span>
              </td>
              <td className="px-4 py-3">
                {member.is_active ? (
                  <Badge className="bg-green-900/40 text-green-300 hover:bg-green-900/40">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-900/40 text-red-300 hover:bg-red-900/40">
                    Inactive
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {Object.keys(member.permissions || {}).map((section) => (
                    <span key={section} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                      {section}
                    </span>
                  ))}
                  {(!member.permissions || Object.keys(member.permissions).length === 0) && (
                    <span className="text-xs text-slate-400">No permissions</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {onToggleActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleActive(member.id, !member.is_active)}
                      className={member.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(member)}>
                      Edit
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No team members found. Add your first team member to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
