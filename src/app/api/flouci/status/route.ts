import { NextResponse } from "next/server";
import { getFlouciCredentials } from "@/lib/flouci";

export const dynamic = "force-dynamic";

/**
 * GET /api/flouci/status — non-secret status for the admin settings page.
 * Never returns the keys themselves.
 */
export async function GET() {
  const { configured } = getFlouciCredentials();
  return NextResponse.json({ provider: "flouci", configured });
}
