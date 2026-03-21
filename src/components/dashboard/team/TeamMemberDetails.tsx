"use client";

import { TeamMember } from '@/types/index';
import { LetterAvatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, Check, Mail, Shield } from 'lucide-react';

interface TeamMemberDetailsProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TeamMemberDetails({
  member,
  open,
  onOpenChange
}: TeamMemberDetailsProps) {
  if (!member) return null;

  const getAllPermissions = () => {
    const permissions = member.permissions || {};
    const allPerms: { section: string; actions: string[] }[] = [];
    Object.entries(permissions).forEach(([section, actions]) => {
      if (Array.isArray(actions) && actions.length > 0) {
        allPerms.push({ section, actions });
      }
    });
    return allPerms;
  };

  const permissionsList = getAllPermissions();

  return (
    <>
      <style>{`
        .member-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .member-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .member-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.45);
          border-radius: 99px;
        }
        .member-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.7);
        }
        .member-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.4) transparent;
        }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        .pop-animate {
          animation: popIn 0.22s cubic-bezier(0.34,1.3,0.64,1) forwards;
        }
        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 9999;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          border: 1.5px solid rgba(6,182,212,0.25);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .close-btn:hover {
          background: #ffffff;
          transform: scale(1.08);
        }
        .avatar-desktop {
          width: 200px;
          height: 200px;
        }
        @media (max-width: 480px) {
          .avatar-desktop {
            width: 110px;
            height: 110px;
          }
        }
        @media (min-width: 481px) and (max-width: 640px) {
          .avatar-desktop {
            width: 140px;
            height: 140px;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="
            fixed z-50
            left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            p-0 border-0 overflow-hidden
            rounded-3xl pop-animate
            [&>button]:hidden
          "
          style={{
            width: 'min(500px, 92vw)',
            height: 'min(500px, 92vh)',
            minWidth: 0,
            minHeight: 0,
            background: 'linear-gradient(170deg, #ecfeff 0%, #cffafe 40%, #a5f3fc 100%)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,182,212,0.18)',
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Team Member Details</DialogTitle>
          </DialogHeader>

          {/* ── CLOSE BUTTON — hard-positioned via plain CSS class, always on top ── */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="close-btn"
            style={{ display: 'flex' }}
            aria-label="Close"
          >
            <X size={15} color="#64748b" strokeWidth={2.5} />
          </button>

          {/* ── COMPACT HEADER STRIP ── */}
          <div className="relative flex-none flex items-center justify-center pt-5 pb-3 px-10">
            <div
              className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none opacity-40"
              style={{ background: 'radial-gradient(circle, #67e8f9 0%, transparent 70%)', transform: 'translate(30%,-30%)' }}
            />
            <div
              className="absolute top-0 left-0 w-20 h-20 rounded-full pointer-events-none opacity-25"
              style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)', transform: 'translate(-30%,-20%)' }}
            />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan-600/80 relative z-10">
              Team Member
            </span>
          </div>

          {/* ── SCROLLABLE CONTENT ── */}
          <div
            className="member-scroll overflow-y-auto px-5 sm:px-7 pb-7"
            style={{ height: 'calc(min(500px, 92vh) - 56px)' }}
          >
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.display_name || 'Team member'}
                    className="avatar-desktop rounded-full object-cover border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="avatar-desktop rounded-full border-4 border-white shadow-xl overflow-hidden">
                    <LetterAvatar
                      name={member.user?.full_name || member.display_name || undefined}
                      email={member.user?.email || ''}
                      size="lg"
                      className="w-full h-full text-4xl"
                    />
                  </div>
                )}
                <span
                  className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-[3px] border-white shadow
                    ${member.is_active ? 'bg-green-400' : 'bg-slate-300'}`}
                />
              </div>
            </div>

            {/* Name */}
            <div className="text-center mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {member.display_name || member.user?.full_name || 'Unknown'}
              </h2>
            </div>

            {/* Role + Status */}
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <Badge className="bg-white/80 text-cyan-700 border border-cyan-200 shadow-sm font-semibold hover:bg-white/80 text-xs px-3">
                {member.role_label || 'Member'}
              </Badge>
              <Badge
                className={`font-semibold text-xs px-3 shadow-sm ${
                  member.is_active
                    ? 'bg-green-100/90 text-green-700 border border-green-200 hover:bg-green-100/90'
                    : 'bg-slate-100/80 text-slate-500 border border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${member.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                {member.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Email card */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-white/80 shadow-sm">
                <div className="w-8 h-8 flex items-center justify-center bg-cyan-100 rounded-xl flex-shrink-0">
                  <Mail className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {member.user?.email || 'No email'}
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions divider */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-white/50" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-[0.18em]">Permissions</span>
              </div>
              <div className="flex-1 h-px bg-white/50" />
            </div>

            {/* Permissions */}
            {permissionsList.length > 0 ? (
              <div className="space-y-2">
                {permissionsList.map(({ section, actions }) => (
                  <div
                    key={section}
                    className="bg-white rounded-2xl px-4 py-3 border border-white/80 shadow-sm"
                  >
                    <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-2">{section}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map((action) => (
                        <span
                          key={action}
                          className="inline-flex items-center gap-1 bg-white border border-green-200 text-green-700 rounded-full text-[10px] font-semibold px-2.5 py-0.5 shadow-sm"
                        >
                          <Check className="w-2.5 h-2.5" />
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white/50 px-4 py-3 rounded-2xl border border-white/70">
                <X className="w-3.5 h-3.5" />
                No permissions assigned
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}