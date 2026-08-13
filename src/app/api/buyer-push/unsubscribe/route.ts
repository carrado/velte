import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/buyer-push/unsubscribe   body: { endpoint? }
export async function POST(req: Request) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const body = await req.json().catch(() => ({}));
  try {
    await backendFetch("/buyer-push/unsubscribe", {
      method: "POST",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to unsubscribe from push.");
  }
}
