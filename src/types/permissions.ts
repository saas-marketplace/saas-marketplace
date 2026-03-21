// Permission types for granular access control

// Available permission actions
export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

// Available sections/domains in the system
export type PermissionSection = 
  | 'dashboard'
  | 'domains' 
  | 'freelancers' 
  | 'products' 
  | 'blogs' 
  | 'requests' 
  | 'team';

// Permission configuration for a single section
export type SectionPermissions = PermissionAction[];

// All permissions as a JSON object
export type Permissions = Partial<Record<PermissionSection, SectionPermissions>>;

// Predefined permission presets
export type PermissionPreset = 'read_only' | 'write' | 'full_access' | 'custom';

// Section metadata for UI display
export interface SectionMeta {
  key: PermissionSection;
  label: string;
  icon: string;
  description: string;
}

// Available sections in the system with metadata
export const SECTIONS: SectionMeta[] = [
  { 
    key: 'dashboard', 
    label: 'Dashboard', 
    icon: 'LayoutDashboard', 
    description: 'View dashboard statistics and overview' 
  },
  { 
    key: 'domains', 
    label: 'Domains', 
    icon: 'Folder', 
    description: 'Manage freelancer domains/categories' 
  },
  { 
    key: 'freelancers', 
    label: 'Freelancers', 
    icon: 'Users', 
    description: 'Manage freelancer profiles' 
  },
  { 
    key: 'products', 
    label: 'Products', 
    icon: 'Package', 
    description: 'Manage marketplace products' 
  },
  { 
    key: 'blogs', 
    label: 'Blog', 
    icon: 'FileText', 
    description: 'Manage blog posts' 
  },
  { 
    key: 'requests', 
    label: 'Client Requests', 
    icon: 'MessageSquare', 
    description: 'Manage client requests and messages' 
  },
  { 
    key: 'team', 
    label: 'Team Members', 
    icon: 'UsersRound', 
    description: 'Manage team members and permissions' 
  },
  
];

// Permission presets for quick assignment
export const PERMISSION_PRESETS: Record<Exclude<PermissionPreset, 'custom'>, Permissions> = {
  read_only: {
    dashboard: ['view'],
    domains: ['view'],
    freelancers: ['view'],
    products: ['view'],
    blogs: ['view'],
    requests: ['view'],
    team: ['view'],
  },
  write: {
    dashboard: ['view'],
    domains: ['view', 'create', 'update'],
    freelancers: ['view', 'create', 'update'],
    products: ['view', 'create', 'update'],
    blogs: ['view', 'create', 'update'],
    requests: ['view', 'create'],
    team: ['view'],
    
  },
  full_access: {
    dashboard: ['view'],
    domains: ['view', 'create', 'update', 'delete'],
    freelancers: ['view', 'create', 'update', 'delete'],
    products: ['view', 'create', 'update', 'delete'],
    blogs: ['view', 'create', 'update', 'delete'],
    requests: ['view', 'create', 'delete'],
    team: ['view', 'create', 'update', 'delete'],
   
  },
};

// Helper function to check if user has specific permission
export function hasPermission(
  permissions: Permissions, 
  section: PermissionSection, 
  action: PermissionAction
): boolean {
  const sectionPermissions = permissions[section];
  if (!sectionPermissions) return false;
  return sectionPermissions.includes(action);
}

// Helper function to check if user can view section
export function canViewSection(permissions: Permissions, section: PermissionSection): boolean {
  return hasPermission(permissions, section, 'view');
}

// Helper function to check if user can create in section
export function canCreateInSection(permissions: Permissions, section: PermissionSection): boolean {
  return hasPermission(permissions, section, 'create');
}

// Helper function to check if user can update in section
export function canUpdateInSection(permissions: Permissions, section: PermissionSection): boolean {
  return hasPermission(permissions, section, 'update');
}

// Helper function to check if user can delete in section
export function canDeleteInSection(permissions: Permissions, section: PermissionSection): boolean {
  return hasPermission(permissions, section, 'delete');
}

// Get all sections user has view access to
export function getAccessibleSections(permissions: Permissions): PermissionSection[] {
  return SECTIONS
    .filter(section => canViewSection(permissions, section.key))
    .map(section => section.key);
}

// Common role labels - maps to system roles
export const ROLE_LABELS = [
  'Super Admin',
  'Admin',
  'Manager',
  'Editor',
  'Support Agent',
  'Blogger',
  'Sales Representative',
  'Content Writer',
  'Customer Support',
  'Product Manager',
  'Marketing Specialist',
  'Developer',
  'Analyst',
  'Consultant',
] as const;

export type RoleLabel = typeof ROLE_LABELS[number];
