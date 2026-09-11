import { tool } from "ai";
import { z } from "zod";

// The structured breadcrumb for a FRESH comparison turn (2026-09-09) — see
// route.ts's own "fresh compare turn" short-circuit and comparisonRule.ts's
// header comment for the two-phase design this belongs to.
//
// A genuine "iPhone vs Samsung"-style comparison (different items/models,
// not different sellers of the same one) is answered conversationally, from
// the model's own general knowledge, with NO Velte search this turn — see
// that system prompt for why. The reply text alone is enough for the buyer,
// but route.ts also needs the exact, search-ready name of whichever option
// the model actually recommended, so that a later "yes" can search Velte
// for it without re-parsing free prose. This tool is that breadcrumb: the
// model calls it once, alongside its own reply, naming its pick in a form
// ready to hand straight to searchProducts/searchStores.
//
// Not `toolChoice: "required"` at the call site — forcing a tool call has
// been observed elsewhere in this file to crowd out the accompanying text
// on some providers (see route.ts's own comment on forced-tool retries),
// and here the PROSE is the actual answer. If the model skips this call,
// route.ts falls back to the first named comparison option instead of
// having nothing at all.
export function comparisonPickTool() {
  return tool({
    description:
      "Call this once, alongside your reply, after you've compared the options and named the one you'd actually recommend.",
    inputSchema: z.object({
      pickItem: z
        .string()
        .describe(
          "The exact thing you recommended, phrased the way a buyer would search for it on Velte — e.g. 'iPhone 17 Pro Max', 'Toyota Camry 2026', 'wedding photographer'. Never a bare brand alone if a specific model was actually named ('iPhone 17 Pro Max', not just 'iPhone').",
        ),
    }),
    execute: async (v) => v,
  });
}
