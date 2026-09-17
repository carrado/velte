import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";

// What to actually look for, when Velte genuinely has nothing (2026-09-04).
//
// Found live: a buyer asked for "a good phone for content creation" and got
// "No results here — nothing on Velte, and nothing close by either." — true,
// and useless. Velte's own catalogue is young and can dead-end on almost
// anything right now; a buyer deserves to leave that moment knowing WHAT to
// look for even when Velte can't yet say WHERE to get it.
//
// This is the one place in the whole pipeline where the model is
// deliberately allowed to name real products it did not verify against the
// database — and that is a narrower exception than it sounds, not a crack
// in "the model never invents supply":
//   - It never claims Velte has any of these, never states a price, never
//     implies stock or a vendor. It's the same kind of thing a knowledgeable
//     friend says before you go shopping, not a listing.
//   - It has precedent elsewhere in this codebase: the (now-retired)
//     per-item clarifier generator let the model name real example answers
//     ("20000mAh", "ankara, lace, aso-oke") for the same reason — general,
//     checkable, real-world knowledge is not the same
//     category of claim as "this specific vendor has this in stock at this
//     price," which is the thing that must only ever come from the database.
//   - It only ever runs on a GENUINE dead end (route.ts's own deadEndTerm —
//     nothing on Velte, nothing nearby, nothing found online either), so it
//     can never crowd out a real match or make the database look thinner
//     than it is.
//
// Deliberately separate from the main tool-calling loop, same tier as
// classifyScope/buildRequestDescription: forced, single-purpose, and never
// something the model chooses to reach for — route.ts decides when this
// runs, not the model.

const TIMEOUT_MS = 6000;
const PROVIDER_ORDER = ["openai", "groq"] as const;

const MIN_SUGGESTIONS = 2;
const MAX_SUGGESTIONS = 4;
const MAX_NAME_LENGTH = 60;
const MAX_REASON_LENGTH = 140;

// Same defensive pattern as searchProductsTool's NON_ATTRIBUTE — a model
// that mostly obeys "never invent" still occasionally narrates its own
// uncertainty or slips a price
// in anyway, and both go straight to a buyer if not caught here.
const PLACEHOLDER_NAME = /\b(n\/a|none|not sure|unknown|varies|depends)\b/i;
const CONTAINS_PRICE = /₦|\bnaira\b|\bprice\b|\d{4,}/i;

function guidanceTool() {
  return tool({
    description:
      "Call this exactly once to suggest real, existing products/brands/models (for an item) or specialisations to look for (for a service) that fit what the buyer described — general market knowledge, never a claim about what Velte itself stocks.",
    inputSchema: z.object({
      suggestions: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                "One real, currently-existing product, brand, or model (for an item) — e.g. 'Tecno Camon 30 Premier', 'Samsung Galaxy A55' — or one real specialisation/qualification to look for (for a service) — e.g. 'a cinematographer who shoots on a gimbal'. Never a product, brand, or model that does not actually exist. Never a price.",
              ),
            reason: z
              .string()
              .describe(
                "One short clause on why this fits what the buyer described — e.g. 'known for stabilised 4K video'. Never a price, never a claim that Velte has it.",
              ),
          }),
        )
        .min(MIN_SUGGESTIONS)
        .max(MAX_SUGGESTIONS)
        .describe(
          `Between ${MIN_SUGGESTIONS} and ${MAX_SUGGESTIONS} real, genuinely different suggestions, most relevant first.`,
        ),
    }),
    execute: async (verdict) => verdict,
  });
}

function systemPromptFor(isService: boolean, maxBudgetNaira?: number): string {
  const lines = [
    "A Nigerian marketplace's search just came back with NOTHING for a buyer's request — not on the marketplace, not nearby, not found online either. Your only job is to tell them what to actually look for, from real-world knowledge, so the moment wasn't wasted even though there is nothing to show them yet.",
    "",
    isService
      ? "The buyer wants a SERVICE done. Suggest real specialisations, qualifications, or kinds of specialist to look for — not a person, not a business name."
      : "The buyer wants to BUY something. Suggest real, currently-existing products, brands, or models that genuinely fit what they described.",
  ];
  if (maxBudgetNaira) {
    lines.push(
      "",
      `The buyer named a maximum budget of ₦${maxBudgetNaira.toLocaleString("en-NG")}. Only suggest things that genuinely, realistically sell at or under that in Nigeria today — a real but wildly-overpriced-for-this-budget option is as useless here as an invented one. If you cannot think of anything real that fits, prefer a lower/older/base-spec option in the same category over naming something out of range.`,
    );
  }
  lines.push(
    "",
    "Hard rules, no exceptions:",
    "- Every suggestion must be REAL. Never invent a brand, model, or product that does not exist — the same rule this marketplace applies everywhere else a model names something specific.",
    "- A real product name is the maker's own name for a specific thing — a model, a SKU, a named collection piece (e.g. 'Tecno Camon 30 Premier', 'Nike Air Force 1', an 'Ankara wrap dress' as a STYLE name). It is NEVER just the buyer's own description restated with a brand stapled on the front. If you catch yourself writing the buyer's own adjectives back in the same order with 'Zara'/'Nike'/'Samsung' etc. prepended, that is not a real product — you do not actually know this exact item exists at that brand, you are guessing, and that guess must not be sent as a name.",
    "- This matters most for fashion/apparel, where there is usually no stable, nameable SKU for a specific look at all (unlike electronics, which really do have discrete model numbers you can know). When nothing specific and real comes to mind, suggest the STYLE or CATEGORY itself (e.g. 'a bodycon midi dress with a button-front placket') with NO brand attached, rather than inventing which brand sells exactly that.",
    "- NEVER state or estimate a price, a naira figure, or a budget range. Price only ever comes from an actual listing, which this turn does not have — a budget above is for you to filter against silently, never to repeat back.",
    "- NEVER imply this marketplace stocks any of these, has them in stock, or that a vendor is waiting — you are suggesting what to look for elsewhere, not describing what's on Velte.",
    "- Base suggestions strictly on what the buyer actually said (the specific need, use-case, or budget they named) — not a generic top-10 list unrelated to their request.",
    "- If the request is too vague to suggest anything specific and real, return the closest genuinely-real category-level suggestions rather than guessing wildly.",
  );
  return lines.join("\n");
}

// Tokeniser for the overlap check below — deliberately the same shape as
// serper.ts's own titleTokens/titleOverlap (lowercase, strip punctuation,
// drop short/stop words), not because the two share code, but because
// they're catching the same kind of thing: a name whose content is mostly
// just the OTHER text restated is a red flag in both places.
const OVERLAP_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "a",
  "an",
  "of",
  "in",
  "on",
  "to",
]);
function overlapTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !OVERLAP_STOPWORDS.has(w)),
  );
}

// Above this share, a suggestion's own name is mostly just the buyer's
// request restated — see isGenuineProductName's own comment for why that's
// the exact shape a fabricated "brand + description" name takes.
const MAX_NEED_OVERLAP = 0.6;

// Found live: asked for a red fitted midi dress with a described button
// detail (from a photo), got back "Zara Red Midi Dress with Asymmetrical
// Buttons", "ASOS Design Red V-Neck Bodycon Dress", etc. — confident-
// sounding, real brand names, and almost certainly not real products: a
// genuine catalog name (a model, a SKU, a named style) does not read as the
// buyer's own attribute list copied back in order with a logo glued on
// front. The prompt now says this explicitly; this is the code-side net
// for when it doesn't listen — a name built mostly out of words already in
// `need` is treated the same as any other unusable suggestion, dropped
// rather than shown as if it were verified. `need` may be empty-ish for a
// very short request, in which case there's nothing to compare against and
// this simply never rejects (division guarded below).
function isGenuineProductName(name: string, needTokens: Set<string>): boolean {
  if (!needTokens.size) return true;
  const nameWords = overlapTokens(name);
  if (!nameWords.size) return true;
  let shared = 0;
  for (const w of nameWords) if (needTokens.has(w)) shared += 1;
  return shared / nameWords.size <= MAX_NEED_OVERLAP;
}

function isUsableName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_NAME_LENGTH &&
    !PLACEHOLDER_NAME.test(trimmed) &&
    !CONTAINS_PRICE.test(trimmed)
  );
}

function isUsableReason(reason: string): boolean {
  const trimmed = reason.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_REASON_LENGTH &&
    !CONTAINS_PRICE.test(trimmed)
  );
}

/**
 * Real-world buying guidance for a turn that found nothing anywhere. Returns
 * null on ANY failure or on output that doesn't survive validation — the
 * caller must already have a working dead-end message with no guidance
 * appended, so this can only ever ADD to that, never be the reason a buyer
 * sees nothing. Never throws.
 */
export async function suggestBuyingGuidance(params: {
  /** The unmatched need, in the buyer's own terms — route.ts's own
   *  deadEndTerm, already the authoritative "what came up empty" text. */
  need: string;
  isService: boolean;
  /** The buyer's own stated ceiling, when this turn had one (route.ts's own
   *  effectiveBudget) — so a suggestion doesn't quietly cost several times
   *  what they said they have to spend. Never repeated back to the buyer
   *  (see systemPromptFor's own hard rule); it only narrows what the model
   *  is allowed to name. */
  maxBudgetNaira?: number;
}): Promise<string | null> {
  const need = params.need.trim();
  if (need.length < 2) return null;

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: systemPromptFor(params.isService, params.maxBudgetNaira),
          messages: [
            { role: "user", content: `The buyer asked for: "${need}"` },
          ],
          tools: { buyingGuidance: guidanceTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "buying-guidance",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("buying guidance generation timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "buyingGuidance",
    )?.output as
      | { suggestions?: { name: string; reason: string }[] }
      | undefined;

    const needTokens = overlapTokens(need);
    const usable = (output?.suggestions ?? [])
      .filter(
        (s) =>
          isUsableName(s.name) &&
          isUsableReason(s.reason) &&
          isGenuineProductName(s.name, needTokens),
      )
      .slice(0, MAX_SUGGESTIONS);
    if (usable.length < MIN_SUGGESTIONS) return null;

    // Formatted here, in code, deliberately — the model supplies content,
    // never the final shape a buyer reads (same split as every other
    // deterministic-vs-model line in this codebase). A COMPLETE reply, not
    // a fragment appended after a separately-written "couldn't find"
    // sentence (found live: two stacked sentences from two different
    // systems read as a form-letter apology followed by an afterthought —
    // one voice, leading with what's actually useful, reads better and is
    // still exactly as honest about Velte having nothing).
    //
    // LEADS WITH THE SUGGESTION, NOT THE DEAD END (2026-09-15, explicit
    // request) — was `Nothing on Velte for "X" yet — here's what's worth
    // looking for instead:`. That framing put the discouraging fact first
    // and the actually-useful part second; this reads as a recommendation
    // grounded in what the buyer described (`need` already carries their
    // stated attributes — see buildProductTerm), not an apology. Still
    // exactly as honest: the closing line still says plainly that none of
    // this is confirmed on Velte yet, which is the fact that actually
    // matters — it was never the "nothing on Velte" wording itself that
    // made this honest.
    const list = usable.map((s) => `• **${s.name}** — ${s.reason}`).join("\n");
    return `Here's what could be a good fit for "${need}":\n${list}\n\nTell me if any of these interest you and I'll check what's actually on Velte.`;
  } catch (err) {
    console.error(
      "[search] buying guidance generation failed, dead end stands as-is:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
