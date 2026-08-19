import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import {
  resolveSearchItem,
  type SearchItemInput,
} from "@/lib/server/ai/resolveSearchItem";
import type { BuyerLocation } from "@/types/search";

// POST /api/search/resolve-item — public (no buyer account), same reasoning
// as /api/search's own top comment.
//
// The client-side half of the dual-intent "resolve item A now, check item B
// in the background" flow (see route.ts's own comment on where this is
// triggered): once the main /api/search turn has resolved item A and told
// the buyer item B is being checked in the background, SearchHome.tsx calls
// THIS route directly for item B — no LLM involved, item B's exact term was
// already extracted by the model on the main turn, so there's nothing left
// to interpret, only to search. Deliberately its own endpoint rather than a
// flag on /api/search: reusing that route would mean re-running the whole
// understanding/tool-choice/location-gate pipeline for a term that's
// already fully specified, for no benefit.
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    item?: SearchItemInput;
    location?: string;
    buyerLocation?: BuyerLocation;
  } | null;

  if (!body?.item) {
    return NextResponse.json({ error: "item is required." }, { status: 400 });
  }

  try {
    const outcome = await resolveSearchItem(
      body.item,
      body.location,
      body.buyerLocation,
    );
    return NextResponse.json({ outcome });
  } catch (err) {
    return fail(err, "Couldn't check that in the background.");
  }
}
