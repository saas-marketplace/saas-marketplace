import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 *
 * Returns the authenticated user's profile (full_name, avatar_url) plus the
 * list of D17 payments the admin has approved ("received") with their
 * delivered order references — this is what drives the "file delivered"
 * label / notification in the profile section.
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profileRes, d17Res] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("d17_payments")
      .select(
        "id, product_name, amount, currency, status, order_id, delivered_at, verified_at, created_at"
      )
      .eq("user_id", user.id)
      .eq("status", "received")
      .order("delivered_at", { ascending: false })
      .limit(20),
  ]);

  if (profileRes.error) {
    console.error("[api/profile] profile error:", profileRes.error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (d17Res.error) {
    console.error("[api/profile] d17 error:", d17Res.error);
    return NextResponse.json({ error: "Failed to load deliveries" }, { status: 500 });
  }

  return NextResponse.json({
    profile: profileRes.data ?? { id: user.id, email: user.email, full_name: null, avatar_url: null },
    approvedPayments: d17Res.data ?? [],
  });
}

/**
 * PATCH /api/profile
 *
 * Body: { fullName?: string, avatarUrl?: string }
 * Lets the signed-in user edit their own name and avatar only.
 */
export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { fullName?: unknown; avatarUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: { full_name?: string; avatar_url?: string } = {};

  if (body.fullName !== undefined) {
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (fullName.length > 100) {
      return NextResponse.json({ error: "Name is too long (max 100 characters)." }, { status: 400 });
    }
    update.full_name = fullName || undefined;
  }

  if (body.avatarUrl !== undefined) {
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      return NextResponse.json({ error: "Avatar must be a valid http(s) URL." }, { status: 400 });
    }
    update.avatar_url = avatarUrl || undefined;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", user.id)
    .select("id, email, full_name, avatar_url")
    .single();

  if (error) {
    console.error("[api/profile] update error:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
