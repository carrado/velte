import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { AIConfigResponse } from "@/types/ai-setup";

// PUT /api/ai-setup/config   body: AIConfig
export async function PUT(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendData<AIConfigResponse>("/ai-setup/config", {
      method: "PUT",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to update AI config.");
  }
}
