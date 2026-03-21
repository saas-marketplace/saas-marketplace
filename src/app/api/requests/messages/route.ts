import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { request_id, message } = body;

    if (!request_id || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the user has access to this request
    const { data: existingRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id, status")
      .eq("id", request_id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this request
    const isOwner = existingRequest.user_id === user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    // Check for both admin and super_admin
    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Determine sender type based on role
    const senderType = isAdmin ? "admin" : "user";

    // Insert the message
    const { data: newMessage, error: messageError } = await supabase
      .from("request_messages")
      .insert({
        request_id,
        sender_id: user.id,
        message,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Update request status - only set to "answered" when admin responds
    // Do NOT change status when user sends a message
    if (isAdmin) {
      await supabase
        .from("requests")
        .update({ status: "answered" })
        .eq("id", request_id);
    }

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error("Error in POST /api/requests/messages:", error);
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

    // Verify the user has access to this request
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

    // Check if user has access to this request
    const isOwner = existingRequest.user_id === user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    // Check for both admin and super_admin
    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages for this request
    const { data: messages, error: messagesError } = await supabase
      .from("request_messages")
      .select("*")
      .eq("request_id", request_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Error in GET /api/requests/messages:", error);
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
    const message_id = searchParams.get("message_id");

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!message_id) {
      return NextResponse.json(
        { error: "Missing message_id" },
        { status: 400 }
      );
    }

    // Get the message to find its request_id
    const { data: existingMessage, error: messageError } = await supabase
      .from("request_messages")
      .select("id, request_id, sender_id")
      .eq("id", message_id)
      .single();

    if (messageError || !existingMessage) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Get the request to check ownership
    const { data: existingRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id")
      .eq("id", existingMessage.request_id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this request
    const isOwner = existingRequest.user_id === user.id;
    const isMessageSender = existingMessage.sender_id === user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    // Check for both admin and super_admin
    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";

    // Allow deletion if: user is admin, OR user is the message sender
    // Note: We allow both the sender AND admin to delete any message (global delete)
    if (!isAdmin && !isMessageSender) {
      return NextResponse.json(
        { error: "Access denied - only the sender or admin can delete this message" },
        { status: 403 }
      );
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from("request_messages")
      .delete()
      .eq("id", message_id);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message_id });
  } catch (error) {
    console.error("Error in DELETE /api/requests/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
