-- DB Migration: Transform permissions JSON from granular arrays to boolean
-- Simple concept: if section exists in permissions, set boolean to true (full access)

-- Step 1: Create a backup of the current permissions
CREATE TABLE IF NOT EXISTS team_members_permissions_backup AS
SELECT id, user_id, permissions, created_at
FROM team_members
WHERE permissions IS NOT NULL;

-- Step 2: Update permissions to boolean format
-- Old format: { "dashboard": ["view"], "domains": ["view", "create", "update", "delete"] }
-- New format: { "canManageDashboard": true, "canManageDomains": true }
-- Logic: If section exists in permissions object, set boolean to true (full access)

UPDATE team_members
SET permissions = jsonb_build_object(
  'canManageDashboard', permissions ? 'dashboard',
  'canManageDomains', permissions ? 'domains',
  'canManageFreelancers', permissions ? 'freelancers',
  'canManageProducts', permissions ? 'products',
  'canManageBlogs', permissions ? 'blogs',
  'canManageRequests', permissions ? 'requests',
  'canManageTeamMembers', permissions ? 'team'
)
WHERE permissions IS NOT NULL;

-- Step 3: Verify the migration
SELECT 
  id,
  user_id,
  permissions->>'canManageDashboard' as canManageDashboard,
  permissions->>'canManageDomains' as canManageDomains,
  permissions->>'canManageFreelancers' as canManageFreelancers,
  permissions->>'canManageProducts' as canManageProducts,
  permissions->>'canManageBlogs' as canManageBlogs,
  permissions->>'canManageRequests' as canManageRequests,
  permissions->>'canManageTeamMembers' as canManageTeamMembers
FROM team_members
WHERE permissions IS NOT NULL
LIMIT 10;

-- Step 4: Create a function to convert boolean permissions back to array format (for backward compatibility)
CREATE OR REPLACE FUNCTION boolean_to_array_permissions(bool_perms JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  section_key TEXT;
  section_name TEXT;
BEGIN
  -- Map boolean keys to section names
  FOR section_key, section_name IN VALUES
    ('canManageDashboard', 'dashboard'),
    ('canManageDomains', 'domains'),
    ('canManageFreelancers', 'freelancers'),
    ('canManageProducts', 'products'),
    ('canManageBlogs', 'blogs'),
    ('canManageRequests', 'requests'),
    ('canManageTeamMembers', 'team')
  LOOP
    IF bool_perms->>section_key = 'true' THEN
      result = result || jsonb_build_object(section_name, '["view","create","update","delete"]'::jsonb);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to convert array permissions to boolean format
CREATE OR REPLACE FUNCTION array_to_boolean_permissions(array_perms JSONB)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'canManageDashboard', array_perms ? 'dashboard',
    'canManageDomains', array_perms ? 'domains',
    'canManageFreelancers', array_perms ? 'freelancers',
    'canManageProducts', array_perms ? 'products',
    'canManageBlogs', array_perms ? 'blogs',
    'canManageRequests', array_perms ? 'requests',
    'canManageTeamMembers', array_perms ? 'team'
  );
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comment to document the migration
COMMENT ON TABLE team_members IS 'Team members table - permissions now use boolean format (canManageXxx: true/false). If section exists, user has full access to that section.';
