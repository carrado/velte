import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequestDecision } from "@/types/buyerRequest";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/vendor/buyer-requests/:id/decision — { decision: "accepted" | "declined" }
// Replaces the old free-text /respond (2026-08-18). Accepting charges the
// vendor's wallet server-side and hands back the buyer's WhatsApp number in
// the same response — see decideOnRequest's own comment.
export async function POST(req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const decision = body?.decision as BuyerRequestDecision | undefined;
  if (decision !== "accepted" && decision !== "declined") {
    return jsonError(400, 'decision must be "accepted" or "declined".');
  }

  try {
    const data = await backendData<{
      decision: BuyerRequestDecision;
      whatsappNumber: string | null;
    }>(`/vendor/buyer-requests/${id}/decision`, {
      method: "POST",
      body: { decision },
      cookie: gate.cookie,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to record your decision.");
  }
}
