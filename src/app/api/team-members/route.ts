import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET - Fetch all team members
export async function GET() {
  // Create response first to capture cookies
  const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
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

    // Only super_admin can access team members
    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch team members with user data
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Create a new team member
export async function POST(request: NextRequest) {
  // Create response first to capture cookies
  const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
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

    // Only super_admin can create team members
    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, display_name, role_label, permissions } = body;

    if (!user_id || !display_name || !role_label) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Map role_label to system role
    let systemRole = 'user';
    if (role_label === 'Super Admin') {
      systemRole = 'super_admin';
    } else if (role_label === 'Admin') {
      systemRole = 'admin';
    }

    // Update user's role in users table
    const { error: userError } = await supabase
      .from('users')
      .update({ role: systemRole })
      .eq('id', user_id);

    if (userError) throw userError;

    // Create team member record
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        user_id,
        display_name,
        role_label,
        permissions: permissions || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT - Update a team member
export async function PUT(request: NextRequest) {
  // Create response first to capture cookies
  const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
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

    // Only super_admin can update team members
    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, display_name, role_label, permissions, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing team member ID' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (display_name) updateData.display_name = display_name;
    if (role_label) updateData.role_label = role_label;
    if (permissions) updateData.permissions = permissions;
    if (is_active !== undefined) {
      updateData.is_active = is_active;
      
      // Get user_id for this team member
      const { data: member } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('id', id)
        .single();
      
      // Update status in users table
      if (member) {
        if (is_active === true) {
          // When reactivating, set status to "restored" to show restored screen
          await supabase
            .from('users')
            .update({ status: 'restored' })
            .eq('id', member.user_id);
          // Also set needs_access_restored = true in team_members
          updateData.needs_access_restored = true;
        } else {
          // When suspending, set status to "suspended"
          await supabase
            .from('users')
            .update({ status: 'suspended' })
            .eq('id', member.user_id);
        }
      }
    }

    // IMPORTANT: Do NOT change the user's role when suspending/reactivating
    // Only update the status (is_active) in team_members
    // The role should always persist to allow proper restoration
    // Access is blocked based on status, not role

    const { data, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - Remove a team member
export async function DELETE(request: NextRequest) {
  // Create response first to capture cookies
  const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
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

    // Only super_admin can delete team members
    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing team member ID' }, { status: 400 });
    }

    // First get the team member to find the user_id
    const { data: member } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('id', id)
      .single();

    // Set status to "removed" in users table
    // This will redirect user to /access-removed on next login
    if (member) {
      await supabase
        .from('users')
        .update({ status: 'removed' })
        .eq('id', member.user_id);
    }

    // Delete the team member record
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
