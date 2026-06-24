import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { InitializeSubscriptionResponse } from "@/types/subscription";

// POST /api/subscription/initialize   body: { tier, plan }
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendData<InitializeSubscriptionResponse>(
      "/subscription/initialize",
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to initialize subscription.");
  }
}
