"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Loader2, 
  ArrowLeft,
  Check,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface NotificationSettings {
  email_notifications: boolean;
  dashboard_alerts: boolean;
  new_request_alerts: boolean;
  team_invitation_alerts: boolean;
  blog_comment_alerts: boolean;
  product_update_alerts: boolean;
  weekly_summary: boolean;
  security_alerts: boolean;
}

const defaultSettings: NotificationSettings = {
  email_notifications: true,
  dashboard_alerts: true,
  new_request_alerts: true,
  team_invitation_alerts: true,
  blog_comment_alerts: true,
  product_update_alerts: true,
  weekly_summary: false,
  security_alerts: true,
};

export default function NotificationsSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setLoading(false);
        return;
      }

      const { data: userSettings, error: fetchError } = await supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (userSettings?.notification_settings) {
        setSettings(prev => ({
          ...prev,
          ...userSettings.notification_settings,
        }));
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setMessage({ type: 'error', text: 'User not authenticated' });
        return;
      }

      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notification_settings: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      setMessage({ type: 'success', text: 'Notification preferences saved successfully' });

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
        <h1 className="text-2xl font-bold text-gray-900">Notifications & Alerts</h1>
        <p className="text-gray-600 mt-1">Control what notifications you receive</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">

        <Section title="Notification Channels" icon={Mail}>
          <ToggleSetting
            title="Email Notifications"
            description="Receive notifications via email"
            icon={Mail}
            enabled={settings.email_notifications}
            onToggle={() => handleToggle('email_notifications')}
          />
          <ToggleSetting
            title="Dashboard Alerts"
            description="Show notifications in the dashboard"
            icon={Bell}
            enabled={settings.dashboard_alerts}
            onToggle={() => handleToggle('dashboard_alerts')}
          />
        </Section>

        <Section title="Activity Notifications" icon={MessageSquare}>
          <ToggleSetting
            title="New Client Requests"
            description="Get notified when new client requests come in"
            icon={MessageSquare}
            enabled={settings.new_request_alerts}
            onToggle={() => handleToggle('new_request_alerts')}
          />
          <ToggleSetting
            title="Team Invitations"
            description="Get notified about team member invitations"
            icon={Bell}
            enabled={settings.team_invitation_alerts}
            onToggle={() => handleToggle('team_invitation_alerts')}
          />
          <ToggleSetting
            title="Blog Comments"
            description="Get notified when someone comments on your posts"
            icon={MessageSquare}
            enabled={settings.blog_comment_alerts}
            onToggle={() => handleToggle('blog_comment_alerts')}
          />
          <ToggleSetting
            title="Product Updates"
            description="Get notified about product-related updates"
            icon={Bell}
            enabled={settings.product_update_alerts}
            onToggle={() => handleToggle('product_update_alerts')}
          />
        </Section>

        <Section title="Summary & Security">
          <ToggleSetting
            title="Weekly Summary"
            description="Receive a weekly summary of activity"
            icon={Bell}
            enabled={settings.weekly_summary}
            onToggle={() => handleToggle('weekly_summary')}
          />
          <ToggleSetting
            title="Security Alerts"
            description="Get notified about security-related events"
            icon={AlertTriangle}
            enabled={settings.security_alerts}
            onToggle={() => handleToggle('security_alerts')}
          />
        </Section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Section Wrapper (clean UI reuse)
function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Toggle
function ToggleSetting({ title, description, icon: Icon, enabled, onToggle }: any) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          enabled ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
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