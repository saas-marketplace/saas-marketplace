import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── SINGLE CLIENT FACTORY ──
// One Supabase client per request — used by every helper below.
// Previously getUserFromRequest was creating 2–3 separate clients per call.
function createSupabaseServerClient() {
  const cookieStore = cookies();
  const response = NextResponse.next();

  return {
    client: createServerClient(
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
    ),
    response,
  };
}

// ── AUTH HELPER ──
// Tries cookie-based auth first (normal browser flow).
// Falls back to the Authorization header only if cookies yield no user.
// Uses the SAME client instance — no extra createServerClient calls.
async function getUserFromRequest(
  request: NextRequest,
  supabase: ReturnType<typeof createSupabaseServerClient>["client"]
) {
  // 1. Cookie-based (standard browser session)
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user && !error) return user;

  // 2. Bearer token fallback (mobile / API clients that pass the token explicitly)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      // Temporarily set the session so getUser() resolves against the token.
      // We only do this when cookies didn't work — happens at most once per request.
      await supabase.auth.setSession({ access_token: token, refresh_token: "" });
      const { data: { user: tokenUser } } = await supabase.auth.getUser();
      return tokenUser ?? null;
    } catch (e) {
      console.error("[auth] Error verifying bearer token:", e);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase } = createSupabaseServerClient();
    const user = await getUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { request_id, message } = body;

    if (!request_id || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the user has access to this request
    const { data: existingRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id, status")
      .eq("id", request_id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isOwner = existingRequest.user_id === user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";
    const isSuperAdmin = userData?.role === "super_admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // For non-super admins check create permission on requests
    if (isAdmin && !isSuperAdmin) {
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("permissions, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teamMember && teamMember.is_active !== false) {
        const permissions =
          teamMember.permissions
            ? typeof teamMember.permissions === "string"
              ? JSON.parse(teamMember.permissions)
              : teamMember.permissions
            : {};
        const requestPermissions = permissions.requests || [];
        if (!requestPermissions.includes("create")) {
          return NextResponse.json(
            { error: "Permission denied - you don't have permission to send messages in this chat" },
            { status: 403 }
          );
        }
      }
    }

    // Insert the message
    const { data: newMessage, error: messageError } = await supabase
      .from("request_messages")
      .insert({ request_id, sender_id: user.id, message })
      .select()
      .single();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    // Only update status to "answered" when admin responds
    if (isAdmin) {
      await supabase.from("requests").update({ status: "answered" }).eq("id", request_id);
    }

    // Notifications (fire-and-forget — failures don't block the response)
    try {
      const [{ data: senderData }, { data: requestData }] = await Promise.all([
        supabase.from("users").select("full_name").eq("id", user.id).single(),
        supabase.from("requests").select("title").eq("id", request_id).single(),
      ]);

      const senderName = senderData?.full_name || "Someone";
      const requestTitle = requestData?.title || "your request";
      const receiverId = isAdmin ? existingRequest.user_id : null;

      if (isAdmin && receiverId) {
        await supabase.from("notifications").insert({
          user_id: receiverId,
          type: "message",
          title: "New Message",
          message: `${senderName} sent you a message about "${requestTitle}"`,
          link: `/requests/${request_id}`,
        });
      } else if (!isAdmin) {
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .in("role", ["admin", "super_admin"]);

        if (admins?.length) {
          await supabase.from("notifications").insert(
            admins.map((admin) => ({
              user_id: admin.id,
              type: "message",
              title: "New Message",
              message: `${senderName} sent a message about "${requestTitle}"`,
              link: `/dashboard/requests?requestId=${request_id}`,
            }))
          );
        }
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error("Error in POST /api/requests/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase } = createSupabaseServerClient();
    const user = await getUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const request_id = searchParams.get("request_id");

    if (!request_id) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    const { data: existingRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id")
      .eq("id", request_id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isOwner = existingRequest.user_id === user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("request_messages")
      .select("*")
      .eq("request_id", request_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Error in GET /api/requests/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { client: supabase } = createSupabaseServerClient();
    const user = await getUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const message_id = searchParams.get("message_id");

    if (!message_id) {
      return NextResponse.json({ error: "Missing message_id" }, { status: 400 });
    }

    const { data: existingMessage, error: messageError } = await supabase
      .from("request_messages")
      .select("id, request_id, sender_id")
      .eq("id", message_id)
      .single();

    if (messageError || !existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const { data: existingRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id")
      .eq("id", existingMessage.request_id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isMessageSender = existingMessage.sender_id === user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";

    if (!isAdmin && !isMessageSender) {
      return NextResponse.json(
        { error: "Access denied - only the sender or admin can delete this message" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from("request_messages")
      .delete()
      .eq("id", message_id);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message_id });
  } catch (error) {
    console.error("Error in DELETE /api/requests/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}