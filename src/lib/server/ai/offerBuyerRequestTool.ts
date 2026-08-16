import { tool } from "ai";
import { z } from "zod";

/**
 * A signal-only tool — no side effects, creates nothing. Call it exists
 * purely to give route.ts/the frontend a mechanical fact ("the model just
 * made the reach-out offer this turn") instead of having to parse the
 * reply text for intent, same reasoning as every other structured signal
 * in this pipeline (matchTier, matchQuality, the bracketed store-handle
 * note — see systemPrompt.ts's own comments on those).
 *
 * Why it needs to exist at all: searchProducts/searchStores' Tier 5
 * (Google Places) can come back in the SAME tool result as an otherwise
 * empty Velte search — so by the time the model is deciding whether to
 * make the reach-out offer, external suggestions may already be sitting
 * in that turn's tool output. The 2026-08-16 "Buyer Requests come first"
 * decision means those have to stay held back from the buyer until EITHER
 * they agree to the offer (createBuyerRequest fires, Places never shown)
 * OR they decline it (a follow-up turn re-searches and reveals Places
 * plainly — see systemPrompt.ts's own rule). `buyerRequestOffered` (set
 * from this tool's call in route.ts) is what SearchHome.tsx checks to
 * suppress the external-suggestion cards on the offer turn specifically —
 * see its own render-priority comment.
 */
export function offerBuyerRequestTool() {
  return tool({
    description:
      "Call this ONCE, in the exact same turn as the sentence in your reply asking the buyer whether you should reach out to businesses on their behalf — never before you've written that offer, never speculatively, never in a turn where a real search already found something useful. Creates nothing (createBuyerRequest does that, only after the buyer explicitly agrees on a later turn) — this is a signal only, so the buyer never sees any effect from it directly.",
    inputSchema: z.object({}),
    execute: async () => ({ offered: true as const }),
  });
}
