"use client";

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Camera, 
  Loader2, 
  User, 
  Trash2, 
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  role_label?: string | null;
}

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdate: (profile: UserProfile) => void;
}

export default function EditProfileModal({ profile, onClose, onUpdate }: EditProfileModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(profile.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      // Upload to Supabase Storage
      const fileName = `avatars/${user.id}-${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-avatars')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload image');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      // Update team_members table
      const { error } = await supabase
        .from('team_members')
        .update({ 
          display_name: name.trim(),
          avatar_url: avatarUrl || null
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Update error:', error);
        alert('Failed to update profile');
        return;
      }

      // Call onUpdate with updated profile
      onUpdate({
        ...profile,
        full_name: name.trim(),
        avatar_url: avatarUrl || null
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const { signOut } = useAuth();

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      // Delete from users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) {
        console.error('Delete error:', error);
        alert('Failed to delete account');
        return;
      }

      // Centralized logout
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveTeam = async () => {
    setLeaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      // Delete from team_members table
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Leave error:', error);
        alert('Failed to leave team');
        return;
      }

      // Centralized logout
      await signOut();
    } catch (error) {
      console.error('Error leaving team:', error);
      alert('Failed to leave team');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-cyan-50">
          <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-2xl font-medium border-4 border-white shadow-lg">
                  {getInitials(name || 'User')}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-cyan-500 text-white rounded-full shadow-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Click to upload new avatar</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="pl-10"
              />
            </div>
          </div>

          {/* Role (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 capitalize">{profile.role_label || profile.role}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLeaveConfirm(true)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Team
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>

        {/* Delete Account Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Account?</h3>
              <p className="text-sm text-gray-600">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Team Confirmation */}
        {showLeaveConfirm && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <LogOut className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Leave Team?</h3>
              <p className="text-sm text-gray-600">
                You will be removed from the team but your account will remain. You can rejoin later if invited.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLeaveTeam}
                  disabled={leaving}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {leaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Leaving...
                    </>
                  ) : (
                    'Leave Team'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}