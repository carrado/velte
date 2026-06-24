import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// PATCH /api/auth/business-type   body: { businessType }
export async function PATCH(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const { user } = await backendFetch<{ user: Record<string, unknown> }>(
      "/auth/business-type",
      { method: "PATCH", body, cookie: gate.cookie },
    );
    return NextResponse.json({ user });
  } catch (err) {
    return fail(err, "Failed to update business type.");
  }
}
