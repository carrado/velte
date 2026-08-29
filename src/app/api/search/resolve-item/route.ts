import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import {
  resolveSearchItem,
  type SearchItemInput,
} from "@/lib/server/ai/resolveSearchItem";
import { pickRecommendation } from "@/lib/server/ai/recommendResults";
import { withTurnUsage } from "@/lib/server/ai/usage";
import { generateUUID } from "@/lib/uuid";
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
// to interpret, only to search (or, if the term is genuinely bare, one
// deterministic clarify round first — see resolveSearchItem.ts's own
// comment; still no LLM call). Deliberately its own endpoint rather than a
// flag on /api/search: reusing that route would mean re-running the whole
// understanding/tool-choice/location-gate pipeline for a term that's
// already fully specified, for no benefit.
export const maxDuration = 30;

// Wrapped for the same reason /api/search is (lib/server/ai/usage.ts): this
// route runs the recommendation call too, so leaving it out would quietly
// undercount what a background item resolution actually costs. Logged as its
// own turn kind — these are deferred background items, not buyer-typed
// searches, and blending them would distort the per-search averages the
// pricing work depends on.
export async function POST(req: Request) {
  return withTurnUsage(
    { turnId: generateUUID(), buyerId: null, hasImage: false },
    () => handleResolveItem(req),
  );
}

async function handleResolveItem(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    item?: SearchItemInput;
    location?: string;
    buyerLocation?: BuyerLocation;
  } | null;

  if (!body?.item) {
    return NextResponse.json({ error: "item is required." }, { status: 400 });
  }

  try {
    let outcome = await resolveSearchItem(
      body.item,
      body.location,
      body.buyerLocation,
    );
    // The Phase 3 recommendation layer, same gate as the main /api/search
    // path (≥2 products) — layered on HERE rather than inside
    // resolveSearchItem so that function keeps its deliberate no-LLM
    // contract (see its own doc comment). pickRecommendation never throws
    // and hard-caps its own runtime, so this can't take the whole
    // resolution down with it — a null just renders plain cards.
    if (outcome.status === "products" && outcome.products.length >= 2) {
      outcome = {
        ...outcome,
        recommendation: await pickRecommendation({
          query: outcome.query,
          products: outcome.products,
        }),
      };
    }
    return NextResponse.json({ outcome });
  } catch (err) {
    return fail(err, "Couldn't check that in the background.");
  }
}
