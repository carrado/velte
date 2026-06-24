import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";

// GET /api/ai-setup/whatsapp-profile
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const data = await backendData("/ai-setup/whatsapp-profile", {
      cookie: gate.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Failed to load WhatsApp profile.");
  }
}

// PUT /api/ai-setup/whatsapp-profile
export async function PUT(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    const data = await backendData("/ai-setup/whatsapp-profile", {
      method: "PUT",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Failed to save WhatsApp profile.");
  }
}
