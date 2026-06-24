import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { Subscription } from "@/types/subscription";

// GET /api/subscription/status
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const subscription = await backendData<Subscription>(
      "/subscription/status",
      { cookie: gate.cookie },
    );
    return NextResponse.json(subscription);
  } catch (err) {
    return fail(err, "Failed to load subscription.");
  }
}
