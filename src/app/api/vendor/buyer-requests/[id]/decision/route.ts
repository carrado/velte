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

  // The optional quote (2026-09-03) — passed straight through rather than
  // validated here. The backend validates it properly (see readQuote in
  // vendorBuyerRequests.controller.js) and it is the side that has to,
  // because it is the side that stores it; a second set of bounds in this
  // file would be one more place for them to disagree about what a
  // realistic price is. Only the SHAPE is normalised, so a stray extra
  // field on the body can't ride along into the backend request.
  const rawQuote = body?.quote;
  const quote =
    rawQuote && typeof rawQuote === "object"
      ? {
          priceKobo: rawQuote.priceKobo ?? null,
          leadTimeDays: rawQuote.leadTimeDays ?? null,
          note: rawQuote.note ?? null,
        }
      : undefined;

  try {
    const data = await backendData<{
      decision: BuyerRequestDecision;
    }>(`/vendor/buyer-requests/${id}/decision`, {
      method: "POST",
      // Omitted entirely on a decline: a declining vendor has no terms to
      // state, and the backend ignores a quote there anyway.
      body:
        decision === "accepted" && quote ? { decision, quote } : { decision },
      cookie: gate.cookie,
    });
    // Accepting no longer unlocks anything to hand back: it records the
    // vendor's price and puts it in front of the buyer, who decides whether
    // to message them. The lead is charged at that click, not this one.
    return NextResponse.json({ decision: data.decision }, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to record your decision.");
  }
}
