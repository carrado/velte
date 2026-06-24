import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { AISetupStatus } from "@/types/ai-setup";

// GET /api/ai-setup/status
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const status = await backendData<AISetupStatus>("/ai-setup/status", {
      cookie: gate.cookie,
    });
    return NextResponse.json(status);
  } catch (err) {
    return fail(err, "Failed to load AI setup status.");
  }
}
