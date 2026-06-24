import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { WABAConfigureResponse } from "@/types/ai-setup";

// POST /api/ai-setup/waba/configure   body: { accessToken }
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await backendData<WABAConfigureResponse>(
      "/ai-setup/waba/configure",
      { method: "POST", body, cookie: gate.cookie },
    );
    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "Failed to configure WhatsApp Business.");
  }
}
