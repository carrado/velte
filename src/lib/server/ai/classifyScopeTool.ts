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
 *
 * `hasMultipleIntents` rides along on this SAME call too — added after a
 * reported false positive: a photo of one item + the caption "where can I
 * get this" got split into a fabricated two-item ("dual intent") flow. The
 * OLD signal for dual intent lived entirely downstream, in route.ts's
 * isGenuineDualIntent(), inferred AFTER the fact from the SHAPE of which
 * tools the main call happened to invoke (both a product search and a
 * store search) plus a token-overlap heuristic on their arguments — but
 * that shape is NOT a reliable proxy for genuine intent count: the exact
 * same shape also happens on a routine single-item, mandatory zero-result
 * cascade (systemPrompt.ts's own rule: an empty searchProducts result MUST
 * fall back to a searchStores call for that SAME need), which the old
 * heuristic could and did mistake for a second, separate need. Judging
 * intent count directly from the BUYER'S OWN WORDS, before any tool call
 * happens, sidesteps that whole class of bug — route.ts now requires BOTH
 * this field AND the downstream heuristic to agree before ever showing a
 * dual-intent split. Judged from text alone (this call never receives the
 * image) — that's sufficient: a genuine second need has to be named in
 * words no matter what the photo shows, and counting how many needs were
 * named doesn't require knowing what a photo-only demonstrative ("this")
 * resolves to. That also keeps this field cheap to compute even on image
 * turns, so route.ts runs this classifier for image messages too now
 * (previously skipped entirely when imageUrl was present) — inScope is
 * simply ignored by the caller on those turns, since a photo is
 * presumptively in scope regardless of how the caption alone reads.
 */
export function classifyScopeTool() {
  return tool({
    description:
      "Call this exactly once to report (a) whether the buyer's message is a genuine request to find or buy something on Velte (a product, food, service, or vendor) — even if vague, ambiguous, or a bare greeting — (b) whether it already names or clearly implies a specific place, and (c) whether it actually names more than one distinct thing the buyer needs.",
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
      hasMultipleIntents: z
        .boolean()
        .describe(
          "true ONLY if the buyer's own words clearly name two or more separate, distinct things they need — e.g. 'fix my laptop, and I also need a caterer for Saturday' names a repair AND a caterer. false for a SINGLE need, no matter how it's phrased, hedged, or elaborated on, and false whenever a photo is attached and the caption is just referring to that one photo (e.g. 'where can I get this', 'how much is this') — that is always one intent, never two, even if the eventual search for it internally tries more than one approach to find it. When genuinely unsure, prefer false — a missed second item just means the buyer asks again; a false split shows them a confusing, made-up choice.",
        ),
      // The 2026-08-25 redesign of the bare-query attribute gate (route.ts):
      // these three fields replace a token-counting heuristic that judged
      // bareness from raw text and a keyword-scored sector guess that could
      // land on the wrong side of buy-vs-service (found live: 'Where can I
      // get a phone' asked about Turnaround Time and Repair Warranty). The
      // model UNDERSTANDS the request here; code keeps validating and
      // selecting the actual questions from the schema.
      itemTerm: z
        .string()
        .nullable()
        .describe(
          "The single core product or service the buyer is currently seeking, as a short clean noun phrase in their own words — 'phone', 'wedding caterer', 'generator repair' — stripped of lead-in phrasing ('where can I get', 'I need a'). For a continuation turn (a shared location, a bare yes/ok), take it from the still-open request earlier in the conversation. null when no identifiable item exists (a greeting, an off-topic message, or a multi-need message where no single item can be named).",
        ),
      seekingKind: z
        .enum(["buy_item", "get_service", "unclear"])
        .describe(
          "'buy_item' when the buyer wants to BUY or obtain a physical item ('where can I get a phone' is a purchase). 'get_service' when they want a job done or a professional hired ('fix my phone', 'I need a plumber', 'someone to sew agbada'). 'unclear' only when the words genuinely support both readings.",
        ),
      requestRelation: z
        .enum(["new", "refinement", "answer"])
        .describe(
          "How this message relates to the conversation so far. Check in order. FIRST: if the last assistant turn asked the buyer something — a clarifying question, their location, their name, or a yes/no reach-out offer — and this message responds to it in any form, it is 'answer'. Responses usually do NOT look like requests: a bare value ('Samsung', '42'), a bare 'yes'/'ok'/'no thanks', a name, the canned 'Shared my location', or a short follow-up about what was just shown ('what do they sell?') are all 'answer'. ONLY if nothing was being awaited: 'refinement' — adjusts the SAME request ('in red instead', 'something cheaper'); or 'new' — the buyer moved on to a DIFFERENT thing and the previous request is finished (a phone after a laptop is 'new'; re-asking for something already found and shown is 'new'). The first message of a conversation is always 'new'. When torn between 'new' and 'refinement', prefer 'refinement'.",
        ),
      hasSpecificDetails: z
        .boolean()
        .describe(
          "true if the buyer has given ANY distinguishing detail about the item beyond its bare name — brand, model, size, color, material, budget, quantity, style, spec, symptom, occasion, or similar — in this message or an earlier turn about the same request. false for a bare mention with nothing distinguishing ('I need a phone', 'looking for a tailor'). A named LOCATION alone does not count as a detail — location is handled separately.",
        ),
    }),
    execute: async ({
      inScope,
      namesPlace,
      hasMultipleIntents,
      itemTerm,
      seekingKind,
      requestRelation,
      hasSpecificDetails,
    }) => ({
      inScope,
      namesPlace,
      hasMultipleIntents,
      itemTerm,
      seekingKind,
      requestRelation,
      hasSpecificDetails,
    }),
  });
}
