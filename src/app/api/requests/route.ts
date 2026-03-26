import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAudit, AuditActions, AuditSections } from "@/lib/services/audit";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to send a request" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      title, 
      message, 
      freelancer_id, 
      freelancer_domain, 
      freelancer_characteristics,
      subject_type = 'custom'
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // If freelancer_id is provided, fetch COMPLETE freelancer details for storing
    let freelancerName: string | null = null;
    let freelancerData: any = null;
    if (freelancer_id) {
      const { data: freelancer } = await supabase
        .from('freelancers')
        .select(`
          display_name, 
          title, 
          domain_id, 
          skills, 
          experience_level, 
          description, 
          rating, 
          review_count, 
          completed_projects,
          avatar_url,
          domains(name)
        `)
        .eq('id', freelancer_id)
        .single();
      
      if (freelancer) {
        freelancerName = freelancer.display_name;
        // Build complete freelancer data object
        // @ts-ignore - Supabase join types are complex
        const domainObj = freelancer.domains;
        const domainName = Array.isArray(domainObj) ? domainObj[0]?.name : null;
        freelancerData = {
          name: freelancer.display_name,
          title: freelancer.title,
          domain: domainName,
          domain_id: freelancer.domain_id,
          skills: freelancer.skills || [],
          experience_level: freelancer.experience_level,
          description: freelancer.description,
          rating: freelancer.rating || 0,
          reviews_count: freelancer.review_count || 0,
          projects_count: freelancer.completed_projects || 0,
          avatar_url: freelancer.avatar_url || null
        };
      }
    }

    // Generate subject based on type and freelancer
    let finalSubject = '';
    if (subject_type === 'hire' && freelancerName) {
      finalSubject = `Freelance Hiring Request - ${freelancerName}`;
    } else if (subject_type === 'info' && freelancerName) {
      finalSubject = `Request for Information - ${freelancerName}`;
    } else if (subject_type === 'project' && freelancerName) {
      finalSubject = `Project Discussion - ${freelancerName}`;
    } else if (subject_type === 'custom' && freelancerName && title) {
      // For custom, append freelancer name to user's subject
      finalSubject = `${title} - ${freelancerName}`;
    } else if (title) {
      finalSubject = title;
    }

    // Use the message as-is - freelancer info is now in freelancer_data
    let fullMessage = message;

    // Create the request in the requests table
    const { data: newRequest, error: requestError } = await supabase
      .from("requests")
      .insert({
        user_id: user.id,
        title: finalSubject || null,
        status: "pending",
        freelancer_id: freelancer_id || null,
        freelancer_domain: freelancer_domain || (freelancerData?.domain) || null,
        freelancer_characteristics: freelancer_characteristics || {
          skills: freelancerData?.skills || [],
          experience_level: freelancerData?.experience_level,
          title: freelancerData?.title
        },
        freelancer_data: freelancerData || null,
        subject_type: subject_type || 'custom',
      })
      .select()
      .single();

    if (requestError) {
      console.error("Error creating request:", requestError);
      return NextResponse.json(
        { error: "Failed to create request" },
        { status: 500 }
      );
    }

    // Insert the initial message into request_messages
    const { error: messageError } = await supabase
      .from("request_messages")
      .insert({
        request_id: newRequest.id,
        sender_id: user.id,
        message: fullMessage,
      });

    if (messageError) {
      console.error("Error inserting initial message:", messageError);
      return NextResponse.json({ 
        request: newRequest, 
        warning: "Request created but initial message failed to save" 
      });
    }

    // ✅ Create notification for admins when new request is created
    try {
      // Get user's full name for dynamic message
      const { data: userData } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const fullName = userData?.full_name || "A user";
      
      // Get all admin user IDs
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .in("role", ["admin", "super_admin"]);
      
      if (admins && admins.length > 0) {
        // Create notification for each admin with requestId in the link
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: "request",
          title: "New Request",
          message: `${fullName} has sent a request to hire a freelancer`,
          link: `/dashboard/requests?requestId=${newRequest.id}`
        }));
        
        await supabase.from("notifications").insert(notifications);
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error("Error creating notification:", notifError);
    }

    return NextResponse.json({ request: newRequest });
  } catch (error) {
    console.error("Error in POST /api/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin or super_admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";

    let query = supabase
      .from("requests")
      .select(`
        *,
        user:users(id, email, full_name),
        freelancer:freelancers(id, display_name, title, domain_id, skills, experience_level, description, rating, review_count, completed_projects, avatar_url, domains(name))
      `)
      .order("created_at", { ascending: false });

    if (isAdmin) {
      // Admin sees all requests - no filter needed
    } else if (user_id) {
      // Filter by specific user_id if provided (for admin/admin use)
      query = query.eq("user_id", user_id);
    } else {
      // Regular users see only their own requests
      query = query.eq("user_id", user.id);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("Error fetching requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error("Error in GET /api/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const request_id = searchParams.get("request_id");

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!request_id) {
      return NextResponse.json(
        { error: "Missing request_id" },
        { status: 400 }
      );
    }

    // Get user role and permissions
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const userRole = userData?.role;
    const isSuperAdmin = userRole === 'super_admin';
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    // Get the request to verify ownership
    const { data: existingRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id")
      .eq("id", request_id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Check permissions - only admin/super_admin can delete (with delete permission for team members)
    let hasDeletePermission = isSuperAdmin;
    
    if (isAdmin && !isSuperAdmin) {
      // Check team_members for delete permission on requests
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('permissions, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teamMember && teamMember.is_active !== false) {
        const permissions = teamMember.permissions ? 
          (typeof teamMember.permissions === 'string' ? JSON.parse(teamMember.permissions) : teamMember.permissions) : 
          {};
        const requestPermissions = permissions.requests || [];
        hasDeletePermission = requestPermissions.includes('delete');
      } else {
        // Default admin has all permissions
        hasDeletePermission = true;
      }
    }

    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: "Permission denied - you don't have delete permission for requests" },
        { status: 403 }
      );
    }

    // Delete the request (cascade will handle related messages)
    const { error: deleteError } = await supabase
      .from("requests")
      .delete()
      .eq("id", request_id);

    if (deleteError) {
      console.error("Error deleting request:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
