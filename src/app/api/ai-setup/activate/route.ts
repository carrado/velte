import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { ActivateAIResponse } from "@/types/ai-setup";

// POST /api/ai-setup/activate
export async function POST() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const result = await backendData<ActivateAIResponse>("/ai-setup/activate", {
      method: "POST",
      cookie: gate.cookie,
    });
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to activate AI.");
  }
}
