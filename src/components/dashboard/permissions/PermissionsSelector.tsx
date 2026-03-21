"use client";

import { useState } from 'react';
import { 
  Permissions, 
  PermissionSection, 
  PermissionAction, 
  SECTIONS, 
  PERMISSION_PRESETS, 
  PermissionPreset 
} from '@/types/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  Users, 
  Package, 
  FileText, 
  MessageSquare, 
  UsersRound,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Shield,
  LayoutDashboard
} from 'lucide-react';

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  Users,
  Package,
  FileText,
  MessageSquare,
  UsersRound,
  LayoutDashboard,
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  view: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

interface PermissionsSelectorProps {
  permissions: Permissions;
  onChange: (permissions: Permissions) => void;
  disabled?: boolean;
}

export default function PermissionsSelector({ 
  permissions, 
  onChange, 
  disabled = false 
}: PermissionsSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PermissionPreset>('custom');

  const handlePresetChange = (preset: PermissionPreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      onChange(PERMISSION_PRESETS[preset]);
    }
  };

  const handleSectionPermissionChange = (
    section: PermissionSection, 
    action: PermissionAction, 
    checked: boolean
  ) => {
    setSelectedPreset('custom');
    
    const currentSectionPermissions = permissions[section] || [];
    let newSectionPermissions: PermissionAction[];
    
    if (checked) {
      newSectionPermissions = [...currentSectionPermissions, action];
    } else {
      newSectionPermissions = currentSectionPermissions.filter(a => a !== action);
    }
    
    const newPermissions = {
      ...permissions,
      [section]: newSectionPermissions,
    };
    
    onChange(newPermissions);
  };

  const isSectionChecked = (section: PermissionSection, action: PermissionAction): boolean => {
    return permissions[section]?.includes(action) || false;
  };

  const getSectionCheckedCount = (section: PermissionSection): number => {
    return permissions[section]?.length || 0;
  };

  return (
    <div className="space-y-6">
      {/* Preset Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">
          Quick Presets
        </Label>
        <div className="flex flex-wrap gap-2">
          {(['read_only', 'write', 'full_access', 'custom'] as PermissionPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetChange(preset)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${selectedPreset === preset 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {preset === 'read_only' && 'Read Only'}
              {preset === 'write' && 'Write Access'}
              {preset === 'full_access' && 'Full Access'}
              {preset === 'custom' && 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Section Permissions */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-slate-700">
          Section Permissions
        </Label>
        
        <div className="grid gap-4">
          {SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.icon] || Shield;
            const checkedCount = getSectionCheckedCount(section.key);
            
            return (
              <div 
                key={section.key}
                className="border border-slate-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 text-white">{section.label}</h4>
                      <p className="text-xs text-slate-500">{section.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {section.key === 'dashboard' 
                      ? `${checkedCount}/1` 
                      : `${checkedCount}/4`} permissions
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                  {section.key === 'dashboard' ? (
                    // Dashboard section - view only
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        id={`${section.key}-view`}
                        checked={isSectionChecked(section.key, 'view')}
                        disabled={disabled}
                        onCheckedChange={(checked: boolean) => 
                          handleSectionPermissionChange(section.key, 'view', checked)
                        }
                        className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                      />
                      <span className="text-sm text-slate-700 capitalize flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        view
                      </span>
                    </label>
                  ) : (
                    // Other sections - all permissions except update for requests
                    (section.key === 'requests' 
                      ? (['view', 'create', 'delete'] as PermissionAction[])
                      : (['view', 'create', 'update', 'delete'] as PermissionAction[])
                    ).map((action) => {
                      const ActionIcon = ACTION_ICONS[action];
                      const isChecked = isSectionChecked(section.key, action);
                      
                      return (
                        <label
                          key={action}
                          className={`
                            flex items-center gap-2 cursor-pointer select-none
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <Checkbox
                            id={`${section.key}-${action}`}
                            checked={isChecked}
                            disabled={disabled}
                            onCheckedChange={(checked: boolean) => 
                              handleSectionPermissionChange(section.key, action, checked)
                            }
                            className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                          />
                          <span className="text-sm text-slate-700 capitalize flex items-center gap-1.5">
                            <ActionIcon className="w-3.5 h-3.5" />
                            {action}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Permission Summary
        </h4>
        <div className="text-sm text-slate-600">
          {Object.entries(permissions).filter(([_, actions]) => actions && actions.length > 0).length > 0 ? (
            <ul className="space-y-1">
              {Object.entries(permissions)
                .filter(([_, actions]) => actions && actions.length > 0)
                .map(([section, actions]) => (
                  <li key={section} className="flex items-center gap-2">
                    <span className="font-medium capitalize">{section}:</span>
                    <span className="text-slate-500">{actions?.join(', ')}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-slate-400 italic">No permissions selected</p>
          )}
        </div>
      </div>
    </div>
  );
}
