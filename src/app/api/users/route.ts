import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Force dynamic rendering - this route uses cookies for authentication
export const dynamic = "force-dynamic";

// GET - Fetch all users with role 'user' (excluding admin and super_admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access denied - Super Admin only" },
        { status: 403 }
      );
    }

    // Build query to get users with role 'user' only
    let query = supabase
      .from("users")
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        is_banned
      `)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get total count
    let countQuery = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "user");

    let bannedCountQuery = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .eq("is_banned", true);

    if (search) {
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      bannedCountQuery = bannedCountQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const [{ count: totalCount }, { count: bannedCount }] = await Promise.all([
      countQuery,
      bannedCountQuery
    ]);

    return NextResponse.json({
      users: users || [],
      total: totalCount || 0,
      banned: bannedCount || 0,
      page,
      limit
    });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Ban or Unban a user
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (adminData?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access denied - Super Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, action } = body;

    if (!user_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: user_id and action" },
        { status: 400 }
      );
    }

    // Verify target user exists and has role 'user'
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id, role, is_banned")
      .eq("id", user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (targetUser.role !== "user") {
      return NextResponse.json(
        { error: "Can only ban/unban users with role 'user'" },
        { status: 400 }
      );
    }

    // Ban/unban user - only use is_banned flag, never IP-based blocking
    // IP-based blocking is unreliable (shared IPs, VPNs, mobile data)
    if (action === "ban") {
      const { error: banError } = await supabase
        .from("users")
        .update({
          is_banned: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", user_id);

      if (banError) {
        console.error("Error banning user:", banError);
        return NextResponse.json(
          { error: "Failed to ban user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "User banned successfully" });
    } 
    else if (action === "unban") {
      const { error: unbanError } = await supabase
        .from("users")
        .update({
          is_banned: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", user_id);

      if (unbanError) {
        console.error("Error unbanning user:", unbanError);
        return NextResponse.json(
          { error: "Failed to unban user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "User unbanned successfully" });
    }
    else {
      return NextResponse.json(
        { error: "Invalid action. Use 'ban' or 'unban'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in PUT /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
