"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Settings as SettingsIcon, 
  Loader2, 
  ArrowLeft,
  Check,
  Save,
  Database,
  Globe,
  Palette,
  Zap,
  Server,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface SystemSettings {
  site_name: string;
  site_description: string;
  support_email: string;
  maintenance_mode: boolean;
  allow_registrations: boolean;
  require_email_verification: boolean;
  enable_beta_features: boolean;
}

const defaultSettings: SystemSettings = {
  site_name: 'Milit Company',
  site_description: 'Your trusted marketplace for freelancer services',
  support_email: 'support@militcompany.com',
  maintenance_mode: false,
  allow_registrations: true,
  require_email_verification: false,
  enable_beta_features: false,
};

export default function SystemSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if super admin using users.role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'super_admin') {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      setIsSuperAdmin(true);
      
      // Fetch system settings from API
      const response = await fetch('/api/system-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const { settings: apiSettings } = await response.json();
      setSettings(apiSettings || defaultSettings);
    } catch (error) {
      console.error('Error checking admin:', error);

    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save via API
      const response = await fetch('/api/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'System settings saved successfully' });


    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
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
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">Only Super Admins can access system settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure system-wide settings (Super Admin only)</p>
      </div>

      {/* Warning */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          These settings affect the entire platform. Please be careful when making changes.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            General Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings(prev => ({ ...prev, site_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Description
              </label>
              <textarea
                value={settings.site_description}
                onChange={(e) => setSettings(prev => ({ ...prev, site_description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            User Management
          </h2>
          
          <div className="space-y-4">
            <ToggleSetting
              title="Allow New Registrations"
              description="Let new users create accounts"
              enabled={settings.allow_registrations}
              onToggle={() => setSettings(prev => ({ ...prev, allow_registrations: !prev.allow_registrations }))}
            />
            
            <ToggleSetting
              title="Require Email Verification"
              description="Users must verify email before accessing"
              enabled={settings.require_email_verification}
              onToggle={() => setSettings(prev => ({ ...prev, require_email_verification: !prev.require_email_verification }))}
            />
          </div>
        </div>

        {/* System Options */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" />
            System Options
          </h2>
          
          <div className="space-y-4">
            <ToggleSetting
              title="Maintenance Mode"
              description="Put the site in maintenance mode"
              enabled={settings.maintenance_mode}
              onToggle={() => setSettings(prev => ({ ...prev, maintenance_mode: !prev.maintenance_mode }))}
            />
            
            <ToggleSetting
              title="Enable Beta Features"
              description="Allow access to experimental features"
              enabled={settings.enable_beta_features}
              onToggle={() => setSettings(prev => ({ ...prev, enable_beta_features: !prev.enable_beta_features }))}
            />
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding
          </h2>
          
          <p className="text-gray-500 text-sm">
            Customize the platform appearance. (Theme customization coming soon)
          </p>
        </div>

        {/* Integrations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Integrations
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Supabase</p>
                <p className="text-sm text-gray-500">Database & Authentication</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Stripe</p>
                <p className="text-sm text-gray-500">Payment Processing</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save System Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// Toggle Setting Component
function ToggleSetting({ 
  title, 
  description, 
  enabled, 
  onToggle 
}: { 
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-cyan-500' : 'bg-gray-300'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
