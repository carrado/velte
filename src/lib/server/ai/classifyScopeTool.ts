import { tool } from "ai";
import { z } from "zod";

/**
 * A signal-only tool (same reasoning as offerBuyerRequestTool.ts's own
 * comment: a forced tool call, not free-text "yes"/"no" parsing, is the
 * reliable way to get a structured answer out of the model — this
 * pipeline never trusts prose alone for anything a downstream decision
 * actually branches on) — used by route.ts's dedicated in-scope check, a
 * single-purpose call with nothing else competing for the model's
 * attention (same technique buildScopeCheckSystemPrompt's own sibling,
 * route.ts's retryLocationOnly, already uses for the location-ask
 * reliability gap).
 *
 * Exists specifically because embedding the "IN SCOPE" judgment inside the
 * main, many-tool system prompt (buildSystemPrompt's own paragraph) proved
 * unreliable in practice — found live: the exact same pasted bcrypt hash
 * variously got a correct off-topic decline, a search using the hash as a
 * literal product name, or a fabricated "dual intent" split pairing it
 * with an invented second item, across repeated runs of the SAME message.
 * Splitting this into its own dedicated call, BEFORE the model ever sees
 * the full tool-choice/location-gate/dual-intent instruction set, is what
 * actually holds.
 *
 * `namesPlace` rides along on this SAME call (rather than a second
 * dedicated round trip) — route.ts needs to know, just as early and just
 * as reliably, whether it can skip straight to a proactive "please share
 * your location" ask before any real search work starts (per explicit
 * request: location must be asked EVERY time it's still missing, not left
 * to the main call's own location gate, which the buyer found unreliable
 * in practice for turns that DID call a real search tool — see route.ts's
 * own comment on searchedNationwideWithoutAsking/needsLocationButDidntAsk,
 * neither of which catches a turn where the model searched nationwide and
 * still found something, however thin).
 */
export function classifyScopeTool() {
  return tool({
    description:
      "Call this exactly once to report (a) whether the buyer's message is a genuine request to find or buy something on Velte (a product, food, service, or vendor) — even if vague, ambiguous, or a bare greeting — and (b) whether it already names or clearly implies a specific place.",
    inputSchema: z.object({
      inScope: z
        .boolean()
        .describe(
          "true if this is (or could plausibly be) a shopping/product/service/vendor request, or a bare greeting inviting one. false only when the message is clearly about something else entirely — general-knowledge questions, coding/writing/homework help, personal advice unrelated to shopping, random text/gibberish/a pasted token or hash, or anything else with no real connection to finding something to buy.",
        ),
      namesPlace: z
        .boolean()
        .describe(
          "true if this message OR any earlier turn in the conversation names or clearly implies a specific place (a city, area, or landmark — e.g. 'in Lekki', 'near Wuse 2 Abuja'). false only when no turn at all has named anywhere more specific than a bare country-level mention ('Nigeria').",
        ),
    }),
    execute: async ({ inScope, namesPlace }) => ({ inScope, namesPlace }),
  });
}
