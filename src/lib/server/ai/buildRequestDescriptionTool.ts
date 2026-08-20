import { tool } from "ai";
import { z } from "zod";

/**
 * A signal-only extraction tool — no side effects, creates nothing. Exists
 * purely so route.ts can get the buyer-request `description` text BEFORE
 * committing to the rest of the reach-out flow (asking for the buyer's
 * name, then actually calling createBuyerRequest), so it can run a real
 * pre-check search on that exact text first — see route.ts's own comment
 * on why: `description` (a fuller, model-authored summary — item, budget,
 * timeframe, location) can score meaningfully differently in vector search
 * than the short term that triggered the original "found a possible
 * vendor" offer, so a buyer could agree, give their name, and STILL land
 * on "couldn't find anyone to contact" — a wasted round trip this tool's
 * whole purpose is to prevent, by finding that out first.
 *
 * Deliberately mirrors createBuyerRequestTool's own `description` field
 * word-for-word (same instructions, same expectations) — this is the
 * exact same text that tool will eventually be called with, just built one
 * step earlier and checked before the buyer invests anything else.
 */
export function buildRequestDescriptionTool() {
  return tool({
    description:
      "Call this exactly once to build a complete, self-contained summary of what the buyer needs, from the whole conversation so far. No other tool call, no reply text this turn.",
    inputSchema: z.object({
      description: z
        .string()
        .min(5)
        .describe(
          "A complete, self-contained summary of what the buyer needs, written the way THEY would describe it to a business — combine everything relevant said across this whole conversation (the item/service, quantity, budget, date/timeframe, location, and any other detail already given). A vendor would eventually read only this text, not the rest of the chat, so it must stand entirely on its own.",
        ),
    }),
    execute: async ({ description }) => ({ description }),
  });
}
