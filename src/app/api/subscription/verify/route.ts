import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { VerifySubscriptionResponse } from "@/types/subscription";

// POST /api/subscription/verify   body: { reference }
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendData<VerifySubscriptionResponse>(
      "/subscription/verify",
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to verify subscription.");
  }
}
