import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import type { BuyerLocation, NearbyBusiness } from "@/types/search";

// POST /api/buyer-requests/nearby — public (no buyer account needed), same
// reasoning as /api/search's own top comment.
//
// Purpose: BuyerRequestOfferWidget's own "no_match" case (createBuyerRequest
// found no vendor to notify) used to just dead-end with a plain sentence —
// see that widget's own comment on why: no AI turn runs for THIS path (the
// request is created by a direct POST once the buyer verifies their phone,
// not by the model), so the normal "no_match re-searches and reveals Google
// Places in the SAME turn" rule from systemPrompt.ts had nothing to attach
// to here. Re-running the actual model just to narrate a fallback search
// was ruled out deliberately — that risks the AI re-offering the exact same
// reach-out and looping (see selfResolvedNoMatch's own comment in the
// widget). This route sidesteps that entirely: it's the same
// bypass-the-model technique route.ts's own deterministic cross-check
// already uses (see that file's comment on searchProductsCore/
// searchStoresCore), just reachable directly by the widget instead of only
// from inside /api/search. `description` is the request's own
// already-built summary (same text just sent to the backend) — good enough
// free-text for a Places lookup even though it's a full sentence, not a
// clean product/business-type term.
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    description?: string;
    location?: BuyerLocation;
  } | null;
  const description = body?.description?.trim();
  if (!description) {
    return NextResponse.json({ externalSuggestions: [] });
  }

  try {
    const result = await searchProductsCore(
      { product: description },
      { buyerLocation: body?.location },
    );
    const externalSuggestions: NearbyBusiness[] =
      "error" in result ? [] : result.externalSuggestions;
    return NextResponse.json({ externalSuggestions });
  } catch (err) {
    return fail(err, "Couldn't check nearby businesses.");
  }
}
