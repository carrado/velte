import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { AiSettings } from "@/types/ai-settings";

// GET /api/auth/ai-settings
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const settings = await backendData<AiSettings>("/auth/ai-settings", {
      cookie: gate.cookie,
    });
    return NextResponse.json(settings);
  } catch (err) {
    return fail(err, "Failed to load AI settings.");
  }
}

// PUT /api/auth/ai-settings
export async function PUT(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const settings = await backendData<AiSettings>("/auth/ai-settings", {
      method: "PUT",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json(settings);
  } catch (err) {
    return fail(err, "Failed to save AI settings.");
  }
}
