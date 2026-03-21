import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET - Check current user's permissions
export async function GET() {
  // Create response first to capture cookies
  const response = NextResponse.json({ 
    isSuperAdmin: false, 
    isAdmin: false, 
    permissions: {},
    accessibleSections: [] 
  });
  
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return response;
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'user';

    // Super admin has full access
    if (userRole === 'super_admin') {
      return NextResponse.json({
        isSuperAdmin: true,
        isAdmin: true,
        permissions: {
          domains: ['view', 'create', 'update', 'delete'],
          freelancers: ['view', 'create', 'update', 'delete'],
          products: ['view', 'create', 'update', 'delete'],
          blogs: ['view', 'create', 'update', 'delete'],
          requests: ['view', 'create', 'update', 'delete'],
          team: ['view', 'create', 'update', 'delete'],
        },
        accessibleSections: ['domains', 'freelancers', 'products', 'blogs', 'requests', 'team'],
      });
    }

    // Check if admin has team_members entry
    if (userRole === 'admin') {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('permissions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (teamMember?.permissions) {
        const sections = Object.keys(teamMember.permissions).filter(
          section => teamMember.permissions[section]?.includes('view')
        );

        return NextResponse.json({
          isSuperAdmin: false,
          isAdmin: true,
          permissions: teamMember.permissions,
          accessibleSections: sections,
        });
      }

      // Admin without team_members entry has no access
      return NextResponse.json({
        isSuperAdmin: false,
        isAdmin: true,
        permissions: {},
        accessibleSections: [],
      });
    }

    // Regular user
    return NextResponse.json({
      isSuperAdmin: false,
      isAdmin: false,
      permissions: {},
      accessibleSections: [],
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return response;
  }
}

// POST - Check specific permission
export async function POST(request: NextRequest) {
  // Create response first to capture cookies
  const response = NextResponse.json({ hasPermission: false });
  
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return response;
    }

    const body = await request.json();
    const { section, action } = body;

    if (!section || !action) {
      return response;
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData?.role || 'user';

    // Super admin has full access
    if (userRole === 'super_admin') {
      return NextResponse.json({ hasPermission: true });
    }

    // Check team member permissions
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!teamMember?.permissions) {
      return response;
    }

    const sectionPermissions = teamMember.permissions[section];
    const hasPermission = sectionPermissions?.includes(action) || false;

    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('Error checking permission:', error);
    return response;
  }
}
