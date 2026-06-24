import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/push/subscribe   body: { userId, subscription }
export async function POST(req: Request) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    await backendFetch("/push/subscribe", {
      method: "POST",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to subscribe to push.");
  }
}
