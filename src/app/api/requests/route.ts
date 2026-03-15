import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    const { title, message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Create the request in the new requests table
    const { data: newRequest, error: requestError } = await supabase
      .from("requests")
      .insert({
        user_id: user.id,
        title: title || null,
        status: "pending",
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
        message: message,
      });

    if (messageError) {
      console.error("Error inserting initial message:", messageError);
      // Still return the request, but warn about message
      return NextResponse.json({ 
        request: newRequest, 
        warning: "Request created but initial message failed to save" 
      });
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isAdmin = userData?.role === "admin";

    let query = supabase
      .from("requests")
      .select(`
        *,
        user:users(id, email, full_name)
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
