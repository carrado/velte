import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { NumbersResponse } from "@/types/ai-setup";

// GET /api/ai-setup/numbers
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const result = await backendData<NumbersResponse>("/ai-setup/numbers", {
      cookie: gate.cookie,
    });
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to load WhatsApp numbers.");
  }
}
