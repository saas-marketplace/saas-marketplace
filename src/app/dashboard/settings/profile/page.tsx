"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { 
  User, 
  Mail, 
  Lock, 
  Trash2, 
  LogOut, 
  Camera, 
  Loader2, 
  Save,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

// ─── Defined OUTSIDE the parent component so React never remounts it ──────────
// If this were inside ProfileSettingsPage, every state change (keystroke, etc.)
// would create a new component type → unmount → remount → lost focus.
function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMountedRef = useRef(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password states — three separate fields for secure 2-step flow
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  // Dedicated state for password feedback — isolated from the shared `message`
  // so Supabase's post-updateUser session refresh can't wipe it mid-render.
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // UI states — initialize to 'password' tab if we just reloaded after a successful password change
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'delete' | 'leave'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('pw') === 'updated') return 'password';
    }
    return 'profile';
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  // On fresh mount after a password-change reload, surface the success message.
  // Using a URL param (?pw=updated) is the only race-free approach: Supabase fires
  // USER_UPDATED synchronously inside updateUser() — before the promise resolves —
  // so any sessionStorage flag set after the call is always too late for auth listeners.
  // A URL param survives a full page reload and is read here before any auth events fire.
const isPasswordUpdatedRef = useRef(false);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('pw') === 'updated') {
    isPasswordUpdatedRef.current = true;

    window.history.replaceState({}, '', window.location.pathname);

    setPasswordMessage({
      type: 'success',
      text: 'Password updated successfully'
    });

    setIsUpdatingPassword(false);

    // ✅ RESET FLAG after first render cycle
    setTimeout(() => {
      isPasswordUpdatedRef.current = false;
    }, 0);
  }
}, []);
  // Clear messages whenever the user switches sections.
  // Skip the initial mount so a success message set right before the first
  // render isn't immediately wiped by this effect.
 useEffect(() => {
  if (!hasMountedRef.current) {
    hasMountedRef.current = true;
    return;
  }

  setMessage(null);

  // ✅ use ref instead of URL (URL is already cleaned)
  if (!isPasswordUpdatedRef.current) {
    setPasswordMessage(null);
  }

}, [activeSection]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!user.id) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .maybeSingle();

      const { data: memberData } = await supabase
        .from('team_members')
        .select('id, user_id, display_name, avatar_url, role_label')
        .eq('user_id', user.id)
        .maybeSingle();

      let role = userData?.role || 'user';

      if (memberData?.role_label) {
        role = memberData.role_label === 'Super Admin' ? 'super_admin' : 'admin';
      }

      const displayName = memberData?.display_name || user.email?.split('@')[0] || '';
      const resolvedAvatarUrl = memberData?.avatar_url || '';

      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: displayName,
        avatar_url: resolvedAvatarUrl || null,
        role,
      });
      
      setName(displayName);
      setAvatarUrl(resolvedAvatarUrl);
      setIsSuperAdmin(role === 'super_admin');
      setIsTeamMember(!!memberData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a JPEG, PNG, or WebP image' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `avatars/${user.id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('team-avatars')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setMessage({ type: 'error', text: 'Failed to upload image' });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('team-avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      if (isTeamMember) {
        const { error: teamError } = await supabase
          .from('team_members')
          .update({ avatar_url: publicUrl })
          .eq('user_id', user.id);

        if (teamError) console.error('Error updating team_members avatar:', teamError);
      }
      
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setMessage({ type: 'success', text: 'Avatar updated successfully' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (isTeamMember) {
        const { error: teamError } = await supabase
          .from('team_members')
          .update({ display_name: name.trim(), avatar_url: avatarUrl || null })
          .eq('user_id', profile?.id);

        if (teamError) throw teamError;
      }

      setProfile(prev => prev ? { ...prev, full_name: name.trim(), avatar_url: avatarUrl || null } : null);
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

 const handleChangePassword = useCallback(async () => {
  if (isUpdatingPassword) return;

  if (newPassword.length < 6) {
    setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
    return;
  }

  setIsUpdatingPassword(true);
  setPasswordMessage(null);

  // Supabase fires USER_UPDATED as soon as the server confirms the password change —
  // BEFORE updateUser()'s own promise resolves (the promise often hangs indefinitely
  // waiting for an internal Web Lock that USER_UPDATED already stole).
  // Solution: redirect inside the event listener instead of waiting for the promise.
  let redirected = false;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
    if (event === 'USER_UPDATED' && !redirected) {
      redirected = true;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
      window.location.replace(window.location.pathname + '?pw=updated');
    }
  });

  // Safety net: if USER_UPDATED never fires within 10 s, surface an error.
  const timeoutId = setTimeout(() => {
    if (!redirected) {
      subscription.unsubscribe();
      setPasswordMessage({ type: 'error', text: 'Request timed out — please try again.' });
      setIsUpdatingPassword(false);
    }
  }, 10_000);

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    // If the promise somehow resolves before the event (rare), clean up and redirect.
    if (!redirected) {
      redirected = true;
      subscription.unsubscribe();
      clearTimeout(timeoutId);

      if (error) throw error;

      window.location.replace(window.location.pathname + '?pw=updated');
    }
  } catch (error: any) {
    // AbortError / Lock broken means USER_UPDATED already fired → already redirecting.
    if (redirected) return;

    redirected = true;
    subscription.unsubscribe();
    clearTimeout(timeoutId);

    console.error('Error changing password:', error);
    setPasswordMessage({
      type: 'error',
      text: error.message || 'Failed to update password',
    });
    setIsUpdatingPassword(false);
  }
}, [isUpdatingPassword, newPassword, confirmPassword, supabase]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }

    if (isSuperAdmin) {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if (count && count <= 1) {
        setMessage({ type: 'error', text: 'Cannot delete your account — you are the last Super Admin' });
        return;
      }
    }

    setSaving(true);
    try {
      await supabase.from('users').delete().eq('id', profile?.id);
      await supabase.from('team_members').delete().eq('user_id', profile?.id);
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ type: 'error', text: 'Failed to delete account' });
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveTeam = async () => {
    setSaving(true);
    try {
      await supabase.from('team_members').delete().eq('user_id', profile?.id);
      await signOut();
    } catch (error) {
      console.error('Error leaving team:', error);
      setMessage({ type: 'error', text: 'Failed to leave team' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Account</h1>
        <p className="text-gray-600 mt-1">Manage your profile information and account settings</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'password', label: 'Change Password', icon: Lock },
          ...(isTeamMember && !isSuperAdmin ? [{ id: 'leave', label: 'Leave Team', icon: LogOut }] : []),
          ...(isSuperAdmin ? [] : [{ id: 'delete', label: 'Delete Account', icon: Trash2 }])
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeSection === tab.id 
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
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* ── Profile Section ─────────────────────────────────────────────────── */}
      {activeSection === 'profile' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
          
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Avatar" 
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-cyan-100 border-4 border-cyan-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-cyan-600">{getInitials(name)}</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="font-medium">Profile Photo</h3>
              <p className="text-sm text-gray-500">Click the camera icon to upload a new photo</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP. Max 2MB.</p>
            </div>
          </div>

          {/* Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Contact support to change your email address</p>
          </div>

          {/* Role (read-only) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Role</label>
            <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 inline-block">
              <span className="text-gray-700 capitalize">{profile?.role?.replace('_', ' ')}</span>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}

      {/* ── Password Section ─────────────────────────────────────────────────── */}
      {activeSection === 'password' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Change Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            For security, we verify your current password before applying any changes.
          </p>

          {/* Password-specific feedback — own state so Supabase session refresh cannot wipe it */}
          {passwordMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              passwordMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-4 max-w-md">
            {/* Current password — required for re-auth */}
            <PasswordField
              id="current-password"
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter your current password"
              show={showCurrentPassword}
              onToggle={() => setShowCurrentPassword(p => !p)}
            />

            <hr className="border-gray-200" />

            {/* New password */}
            <PasswordField
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password (min. 6 characters)"
              show={showNewPassword}
              onToggle={() => setShowNewPassword(p => !p)}
            />

            {/* Confirm new password */}
            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter new password"
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(p => !p)}
            />

            {/* Live match hint */}
            {confirmPassword.length > 0 && (
              <p className={`text-xs ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          <button
            onClick={handleChangePassword}
            disabled={isUpdatingPassword}
            className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingPassword
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
              : <><Lock className="w-4 h-4" /> Update Password</>
            }
          </button>
        </div>
      )}

      {/* ── Delete Account Section ───────────────────────────────────────────── */}
      {activeSection === 'delete' && (
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-800">Delete Account</h2>
              <p className="text-gray-600 mt-2 mb-4">
                Once you delete your account, there is no going back. Please be certain.
                This will permanently delete your profile and all associated data.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  I want to delete my account
                </button>
              ) : (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 mb-4">
                    <strong>Warning:</strong> This action cannot be undone. Type <strong>DELETE</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-4 py-2 border border-red-300 rounded-lg mb-4"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={saving || deleteConfirmText !== 'DELETE'}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete My Account'}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Leave Team Section ───────────────────────────────────────────────── */}
      {activeSection === 'leave' && (
        <div className="bg-white border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <LogOut className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-amber-800">Leave Team</h2>
              <p className="text-gray-600 mt-2 mb-4">
                If you leave the team, you will lose access to all team resources and features.
                You can request an invitation again later if needed.
              </p>

              {!showLeaveConfirm ? (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  I want to leave the team
                </button>
              ) : (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 mb-4">
                    Are you sure you want to leave this team?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLeaveTeam}
                      disabled={saving}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Leave Team'}
                    </button>
                    <button
                      onClick={() => setShowLeaveConfirm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}