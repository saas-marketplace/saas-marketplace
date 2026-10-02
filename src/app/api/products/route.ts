import { NextResponse } from "next/server";
import { getAuthedAdmin, canManageProducts } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set(["ebooks", "templates", "design", "assets"]);

function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Validates and normalises an incoming product payload.
 * Subscription plans are validated here so a bypassed client cannot store a
 * malformed billing payload.
 */
function buildProductPayload(body: Record<string, any>, isUpdate: boolean) {
  const title = String(body.title ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (title.length > 300) return { error: "Title is too long" };

  const category = String(body.category ?? "templates");
  if (!VALID_CATEGORIES.has(category)) return { error: "Invalid category" };

  const productType = body.product_type === "subscription" ? "subscription" : "one_time";


  // ── Subscription plans ─────────────────────────────────────────────────────
  // Plans only describe pricing on the product page. Actual recurring billing
  // runs through Flouci subscriptions created server-side from these prices.
  const subscriptionPlans: any[] = [];
  if (productType === "subscription") {
    const rawPlans = Array.isArray(body.subscription_plans) ? body.subscription_plans : [];
    for (const p of rawPlans) {
      const name = String(p?.name ?? "").trim();
      const planPrice = Number(p?.price);
      const currency = String(p?.currency ?? "TND").trim().toUpperCase();
      if (currency !== "TND") {
        return { error: "Plans are priced in TND only" };
      }
      const billingPeriod = String(p?.billingPeriod ?? "monthly").trim().toLowerCase() || "monthly";
      if (!name || !Number.isFinite(planPrice) || planPrice < 0) {
        return { error: "Each subscription plan needs a name and a valid price" };
      }
      subscriptionPlans.push({
        id: String(p?.id ?? "").trim() || undefined,
        name: name.slice(0, 100),
        price: planPrice,
        currency,
        billingPeriod,
        description: String(p?.description ?? "").slice(0, 1000),
        isActive: p?.isActive !== false,
      });
    }
    if (subscriptionPlans.length === 0) {
      return { error: "A subscription product needs at least one plan" };
    }
  } else if (Array.isArray(body.subscription_plans) && body.subscription_plans.length > 0) {
    return { error: "Plans can only be added to a subscription product" };
  }

  // ── Prices come from the server-side parse of the form, never trusted raw ──
  const priceRaw = Number(body.price);
  const salePriceRaw = body.sale_price === null || body.sale_price === undefined || body.sale_price === ""
    ? null
    : Number(body.sale_price);

  let price = priceRaw;

  if (productType === "subscription") {
    // products.price is NOT NULL in the schema. For a subscription it is a
    // display-only reference taken from the first active plan.
    if (!Number.isFinite(priceRaw) || priceRaw < 0) {
      const first = subscriptionPlans.find((p) => p.isActive) ?? subscriptionPlans[0];
      if (!first) return { error: "A subscription product needs a plan price" };
      price = first.price;
    }
  } else {
    if (!Number.isFinite(priceRaw) || priceRaw < 0) return { error: "Price must be 0 or more" };
  }

  if (salePriceRaw !== null && (!Number.isFinite(salePriceRaw) || salePriceRaw < 0)) {
    return { error: "Sale price must be 0 or more" };
  }

  const descriptionRaw = body.description;
  const longDescriptionRaw = body.long_description;

  const payload: Record<string, unknown> = {
    title,
    slug: String(body.slug ?? "").trim() || slugify(title),
    description:
      descriptionRaw === null || descriptionRaw === undefined || String(descriptionRaw).trim() === ""
        ? null
        : String(descriptionRaw).trim().slice(0, 5000),
    long_description:
      longDescriptionRaw === null || longDescriptionRaw === undefined || String(longDescriptionRaw).trim() === ""
        ? null
        : String(longDescriptionRaw).trim().slice(0, 20000),
    price,
    sale_price: salePriceRaw,
    category,
    tags: Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).slice(0, 60)).slice(0, 50) : [],
    image_url: body.image_url ? String(body.image_url).slice(0, 2000) : null,
    file_url: body.file_url ? String(body.file_url).slice(0, 2000) : null,
    is_featured: Boolean(body.is_featured),
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    product_type: productType,
    subscription_plans: subscriptionPlans,
    updated_at: new Date().toISOString(),
  };

  if (isUpdate) return { payload };
  return {
    payload: {
      ...payload,
      like_count: 0,
      download_count: 0,
      created_at: new Date().toISOString(),
    },
  };
}

/** POST /api/products — create a product (server-validated) */
export async function POST(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProducts(admin, "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const built = buildProductPayload(body, false);
  if ("error" in built) return badRequest(built.error as string);

  const { data, error } = await admin.supabase
    .from("products")
    .insert([built.payload])
    .select()
    .single();

  if (error) {
    console.error("[api/products] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}

/** PUT /api/products — update a product (server-validated) */
export async function PUT(request: Request) {
  const admin = await getAuthedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProducts(admin, "update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const id = String(body.id ?? "").trim();
  if (!id) return badRequest("Product id is required");

  const built = buildProductPayload(body, true);
  if ("error" in built) return badRequest(built.error as string);

  const { data, error } = await admin.supabase
    .from("products")
    .update(built.payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[api/products] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
