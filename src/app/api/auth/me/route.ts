import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// GET /api/auth/me
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const { user } = await backendFetch<{ user: Record<string, unknown> }>(
      "/auth/me",
      { cookie: gate.cookie },
    );
    return NextResponse.json({ user });
  } catch (err) {
    return fail(err, "Failed to load profile.");
  }
}
