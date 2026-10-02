import { NextResponse } from "next/server";
import { getAuthedAdmin, isSuperAdmin } from "@/lib/api-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/admin/plans — list all plans (admins). */
export async function GET() {
  const admin = await getAuthedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin.supabase
    .from("subscription_plans")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

/** POST /api/admin/plans — create a plan. */
export async function POST(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = parsePlan(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Writes go through the service role: migration 006 enabled RLS on this table
  // with only a SELECT policy, so the caller's own session is rejected on INSERT.
  // The super-admin check above is the authorisation gate — RLS is not it.
  const db = createServiceSupabaseClient();

  const { data, error } = await db
    .from("subscription_plans")
    .insert([parsed.payload])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data }, { status: 201 });
}

/** PUT /api/admin/plans — update a plan. */
export async function PUT(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });

  const parsed = parsePlan(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = createServiceSupabaseClient();

  const { data, error } = await db
    .from("subscription_plans")
    .update({ ...parsed.payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

/** DELETE /api/admin/plans — delete a plan. */
export async function DELETE(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });

  const db = createServiceSupabaseClient();

  const { error } = await db
    .from("subscription_plans")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function parsePlan(body: any): { error: string } | { payload: Record<string, unknown> } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };

  const name = String(body.name ?? "").trim();
  if (!name) return { error: "Plan name is required" };

  const price = Number(body.price_tnd ?? body.price);
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be 0 or more" };

  // Flouci settles in TND only, so a plan cannot carry another currency.
  const currency = String(body.currency ?? "TND").trim().toUpperCase();
  if (currency !== "TND") {
    return { error: "Plans are priced in TND only" };
  }

  const interval = String(body.interval ?? "month").toLowerCase();
  if (!["day", "week", "month", "year"].includes(interval)) {
    return { error: "Interval must be day, week, month or year" };
  }

  const intervalCount = Number(body.interval_count ?? 1);
  if (!Number.isInteger(intervalCount) || intervalCount < 1) {
    return { error: "Interval count must be a whole number of 1 or more" };
  }

  const features = Array.isArray(body.features)
    ? body.features.map((f: unknown) => String(f).slice(0, 200)).slice(0, 30)
    : [];

  const maxCyclesRaw = body.max_cycles;
  const maxCycles =
    maxCyclesRaw === null || maxCyclesRaw === undefined || maxCyclesRaw === "" || Number(maxCyclesRaw) < 1
      ? null
      : Number(maxCyclesRaw);

  return {
    payload: {
      name: name.slice(0, 100),
      description: body.description ? String(body.description).slice(0, 2000) : null,
      price_tnd: price,
      currency,
      interval,
      interval_count: intervalCount,
      features,
      max_cycles: maxCycles,
      active: body.active === undefined ? true : Boolean(body.active),
      display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0,
    },
  };
}
