import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logAudit, AuditActions, AuditSections } from '@/lib/services/audit';

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

    // ✅ Log audit event for creating team member
    await logAudit({
      action: AuditActions.CREATE_TEAM_MEMBER,
      section: AuditSections.TEAM_MEMBERS,
      details: `Created team member: ${display_name}`,
      user_id: user.id,
      user_email: user.email || "unknown",
    });

    // ✅ Create notification for super_admin when team member is added
    try {
      // Get admin's full name for dynamic message
      const { data: adminData } = user?.id ? await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single() : { data: null };
      
      const adminName = adminData?.full_name || "Admin";
      
      // Get all super_admin user IDs
      const { data: superAdmins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "super_admin");
      
      if (superAdmins && superAdmins.length > 0) {
        // Create notification for each super_admin
        const notifications = superAdmins.map(admin => ({
          user_id: admin.id,
          type: "team",
          title: "Team Activity",
          message: `${adminName} added a new team member: ${display_name}`,
          link: `/dashboard/team`
        }));
        
        await supabase.from("notifications").insert(notifications);
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error("Error creating team notification:", notifError);
    }

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

    // ✅ Log audit event for updating team member
    await logAudit({
      action: AuditActions.UPDATE_TEAM_MEMBER,
      section: AuditSections.TEAM_MEMBERS,
      details: `Updated team member: ${display_name || id}`,
      user_id: user.id,
      user_email: user.email,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
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

    // First get the team member to find the user_id and display_name
    const { data: member } = await supabase
      .from('team_members')
      .select('user_id, display_name')
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

    // ✅ Log audit event for deleting team member
    await logAudit({
      action: AuditActions.DELETE_TEAM_MEMBER,
      section: AuditSections.TEAM_MEMBERS,
      details: `Deleted team member: ${member?.display_name || id}`,
      user_id: user.id,
      user_email: user.email,
    });

    return NextResponse.json({ success: true });

    if (error) throw error;

    // ✅ Create notification for super_admin when team member is removed
    try {
      // Get admin's full name for dynamic message
      const userId = user?.id;
      const { data: adminData } = userId ? await supabase
        .from("users")
        .select("full_name")
        .eq("id", userId)
        .single() : { data: null };
      
      const adminName = adminData?.full_name || "Admin";
      
      // Get all super_admin user IDs
      const { data: superAdmins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "super_admin");
      
      const adminCount = superAdmins?.length ?? 0;
      if (adminCount === 0) return;
      
      // Create notification for each super_admin
      const notifications = superAdmins!.map(admin => ({
        user_id: admin.id,
        type: "team",
        title: "Team Activity",
        message: `${adminName} removed a team member`,
        link: `/dashboard/team`
      }));
      
      await supabase.from("notifications").insert(notifications);
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error("Error creating team notification:", notifError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
