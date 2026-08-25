import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import type { SearchRecommendation, VendorMatch } from "@/types/search";

// Phase 3 (docs/velte-ai-search-flow-plan.md): the comparison /
// recommendation layer — ONE extra structured-output LLM call after the
// main tool loop, only ever run by route.ts when a turn has ≥2 real product
// results. Same signal-only forced-tool technique classifyScopeTool's own
// comment explains (a forced tool call, never prose parsing, for anything a
// downstream decision branches on). The division of labor is strict:
//
//   - The MODEL judges fit — which candidate best matches what the buyer
//     actually asked for (bestOverall), which is the smartest
//     price-for-what-you-get (bestValue) — and writes the one-line whys.
//   - CODE decides everything checkable: `nearest` comes straight from
//     distanceKm (never the model's guess), returned ids are verified
//     against the real candidate set, reasons are sanitized, and a
//     bestValue that just duplicates bestOverall is dropped as redundant.
//
// Every failure path — provider error, timeout, ids that don't verify —
// returns null, and route.ts renders plain cards exactly as before. This
// layer is a pure enhancement, never a new failure mode.

// Hard wall-clock cap on the extra call. The turn's real work is already
// done by the time this runs — the buyer is waiting on nothing but this,
// so a hung provider must never eat meaningfully into the route's 60s
// budget for the sake of two badges.
const RECOMMEND_TIMEOUT_MS = 8000;

// Reasons render inside a small chip/summary line — a paragraph would
// break the layout, and the model is told to stay short anyway; the slice
// is just the guarantee.
const MAX_REASON_LENGTH = 160;

// Same shape of leak sanitizeReply (route.ts) guards the main reply
// against: the card's WhatsApp button is the only contact channel, so a
// reason that smuggles a phone number in is dropped outright.
const PHONE_LIKE = /\+?(?:\d[\s-]?){9,16}\d/;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;

function sanitizeReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(MARKDOWN_IMAGE, "")
    .replace(MARKDOWN_LINK, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || PHONE_LIKE.test(cleaned)) return null;
  return cleaned.length > MAX_REASON_LENGTH
    ? `${cleaned.slice(0, MAX_REASON_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

function recommendResultsTool() {
  return tool({
    description:
      "Call this exactly once with your comparison verdict over the candidate products/services provided.",
    inputSchema: z.object({
      leadIn: z
        .string()
        .describe(
          "ONE short, natural sentence in your own conversational voice introducing the comparison to the buyer (e.g. 'Between these, here's where I'd lean:' or 'A quick take before you scroll:'). Vary the phrasing naturally turn to turn — never a generic heading like 'Recommendations' or 'Velte's Picks', and never contact details.",
        ),
      bestOverallId: z
        .string()
        .describe(
          "The `id` of the single candidate that best fits what the buyer actually asked for, all things considered (fit to the request first, then price and distance as tie-breakers).",
        ),
      bestOverallReason: z
        .string()
        .describe(
          "ONE short sentence (under 20 words) telling the buyer why this is the best fit — concrete and specific to this candidate, never generic filler. Never include contact details of any kind.",
        ),
      bestValueId: z
        .string()
        .nullable()
        .describe(
          "The `id` of the candidate with the smartest price for what you get, or null if that's the same candidate as bestOverallId or no candidate stands out on value (e.g. prices are all quote-on-request).",
        ),
      bestValueReason: z
        .string()
        .nullable()
        .describe(
          "ONE short sentence (under 20 words) on why it's the best value, or null when bestValueId is null. Never include contact details of any kind.",
        ),
      tradeoffId: z
        .string()
        .nullable()
        .describe(
          "The `id` of a candidate that is tempting for one clear reason but comes with a REAL catch the buyer should know before choosing it — typically the cheapest one when it differs in edition/model/condition from what they asked for, or when its sellerInfo shows far less to go on than the others. null when no candidate has a catch worth flagging, or when the honest answer is that they're broadly equivalent. Do not manufacture a catch to fill this in.",
        ),
      tradeoffNote: z
        .string()
        .nullable()
        .describe(
          "ONE short sentence (under 25 words) naming the catch plainly and only from the candidate data given — e.g. 'It's the digital edition, not the disc one' or 'Cheapest of the three, but the listing has no photos and no contact details'. null when tradeoffId is null. Never invent a difference the data doesn't show, and never include contact details.",
        ),
    }),
    execute: async (verdict) => verdict,
  });
}

// How much a seller has actually told buyers about this listing — computed
// in CODE from fields that are simply present or absent, never judged by
// the model. This exists because the comparison was previously blind to it:
// it could say which listing was cheaper, but not that the cheap one is a
// bare name with no photos and no reachable contact while the pricier one
// is fully filled in. That's often the single most useful thing to tell a
// buyer, and a model with no data for it can only fabricate — a confident
// "this seller has limited information" is unverifiable and slips past
// every sanitizer, since it isn't a phone number or a markdown link.
//
// Note `hasContact` is a boolean about WHETHER a number exists — the number
// itself is never sent to the model (see this file's own sanitizeReason,
// and route.ts's own leaked-phone guard).
function sellerInfo(match: VendorMatch) {
  const photoCount =
    (match.mainImageUrl ? 1 : 0) + (match.thumbnailUrls?.length ?? 0);
  const descriptionLength = match.description?.trim().length ?? 0;
  const detailCount = match.attributes.length;
  // A blunt three-way label so the model doesn't have to do arithmetic on
  // the raw counts to reach the obvious conclusion. "detailed" needs real
  // substance on every axis; "sparse" is a listing a buyer would struggle
  // to judge at all.
  const score =
    (photoCount >= 2 ? 1 : 0) +
    (descriptionLength >= 60 ? 1 : 0) +
    (detailCount >= 2 ? 1 : 0) +
    (match.whatsapp ? 1 : 0);
  const completeness =
    score >= 4 ? "detailed" : score >= 2 ? "moderate" : "sparse";
  return {
    completeness,
    photoCount,
    detailCount,
    hasDescription: descriptionLength > 0,
    hasContact: Boolean(match.whatsapp),
    hasStorefront: Boolean(match.storeHandle),
  };
}

// Does `a` genuinely differ from `b` in anything a buyer could act on?
// Used to verify a claimed tradeoff actually has something behind it (see
// pickRecommendation). Price, seller-information completeness, and the
// vendor-entered detail fields are the axes a "catch" can honestly live on;
// two listings identical across all three have no difference to describe.
export function differsMeaningfully(a: VendorMatch, b: VendorMatch): boolean {
  if (a.price !== b.price || a.quoteOnRequest !== b.quoteOnRequest) return true;
  const aInfo = sellerInfo(a);
  const bInfo = sellerInfo(b);
  if (aInfo.completeness !== bInfo.completeness) return true;
  if (aInfo.hasContact !== bInfo.hasContact) return true;
  const fingerprint = (m: VendorMatch) =>
    m.attributes
      .map((x) => `${x.name.toLowerCase()}=${x.value.toLowerCase()}`)
      .sort()
      .join("|");
  if (fingerprint(a) !== fingerprint(b)) return true;
  // Different names can still mean a different edition/model even when
  // every structured field matches ("PS5 Digital" vs "PS5 Disc").
  return a.name.trim().toLowerCase() !== b.name.trim().toLowerCase();
}

/** The compact, model-facing view of one candidate — no images, no contact
 * fields (nothing to leak), descriptions clipped hard. */
function candidateSummary(match: VendorMatch) {
  return {
    id: match.productId,
    kind: match.kind,
    name: match.name,
    price: match.quoteOnRequest
      ? "quote on request"
      : `${match.currency} ${match.price}${match.priceMax != null && match.priceMax > match.price ? `–${match.priceMax}` : ""}`,
    distanceKm: match.distanceKm,
    description: match.description ? match.description.slice(0, 160) : null,
    attributes: match.attributes
      .slice(0, 6)
      .map((a) => `${a.name}: ${a.value}`),
    relevanceScore: match.score,
    sellerInfo: sellerInfo(match),
  };
}

/**
 * The one extra comparison call. `query` is what the buyer asked for (their
 * own words, or the searched term for a photo turn). Never throws.
 */
export async function pickRecommendation(params: {
  query: string;
  products: VendorMatch[];
}): Promise<SearchRecommendation | null> {
  const { query, products } = params;
  if (products.length < 2) return null;

  // Deterministic and free — computed regardless of whether the model call
  // below succeeds or not... but only shipped as part of a full
  // recommendation: a lone "Nearest" chip with no picks around it reads as
  // an odd orphan, not a comparison. Null when no candidate has a real
  // distance (a nationwide match has nothing to measure from).
  let nearestId: string | null = null;
  let nearestKm = Infinity;
  for (const p of products) {
    if (p.distanceKm != null && p.distanceKm < nearestKm) {
      nearestKm = p.distanceKm;
      nearestId = p.productId;
    }
  }

  try {
    const result = await Promise.race([
      callLLM(
        {
          system:
            "You compare shopping search results for a buyer on Velte, a Nigerian vendor-discovery service. You will get the buyer's request and a JSON list of candidate products/services that already matched it. Judge which candidate best fits what the buyer actually asked for, which (if any) is the smartest value for money, and whether one of them carries a real catch worth flagging. Judge ONLY from the data given — never invent capability, stock, or quality a candidate's own fields don't show.\n\nEach candidate carries a `sellerInfo` block describing how much the seller has actually filled in: `completeness` (detailed/moderate/sparse), how many photos, how many detail fields, whether there's a description, whether the vendor is reachable (`hasContact`), and whether they have a storefront. This is real data and you SHOULD use it — a listing that is cheaper but sparse and unreachable is a genuinely worse bet than a slightly pricier detailed one, and saying so plainly is exactly what helps. But describe only what these fields actually say: never call a seller verified, trusted, rated, reviewed, official or established — none of that is measured here, and `hasContact: true` means a contact exists, nothing more about who they are.\n\nCall the recommendResults tool exactly once with your verdict.",
          messages: [
            {
              role: "user",
              content: `Buyer's request: "${query}"\n\nCandidates:\n${JSON.stringify(products.map(candidateSummary), null, 2)}`,
            },
          ],
          tools: { recommendResults: recommendResultsTool() },
          toolChoice: "required",
        },
        ["openai", "groq"],
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("recommendation timed out")),
          RECOMMEND_TIMEOUT_MS,
        ),
      ),
    ]);

    const verdict = result.toolResults.find(
      (r) => r.toolName === "recommendResults",
    )?.output as
      | {
          leadIn: string;
          bestOverallId: string;
          bestOverallReason: string;
          bestValueId: string | null;
          bestValueReason: string | null;
          tradeoffId: string | null;
          tradeoffNote: string | null;
        }
      | undefined;
    if (!verdict) return null;

    // Ids the model returns are claims, not facts — verify against the
    // real result set (a fallback model has hallucinated tool arguments
    // before; see route.ts's LEAKED_FUNCTION_CALL history).
    const validIds = new Set(products.map((p) => p.productId));
    const bestOverallId = validIds.has(verdict.bestOverallId)
      ? verdict.bestOverallId
      : null;
    let bestValueId =
      verdict.bestValueId && validIds.has(verdict.bestValueId)
        ? verdict.bestValueId
        : null;
    if (bestValueId === bestOverallId) bestValueId = null;

    if (!bestOverallId && !bestValueId) return null;

    // The tradeoff gets a stricter check than the picks: a pick is a
    // judgment ("this fits you best"), but a tradeoff is a CLAIM about a
    // difference, and an invented difference is a lie the buyer would act
    // on. So the id must be real, the note must survive sanitizing, and
    // the flagged candidate must ACTUALLY differ from the top pick in
    // price or in its own detail fields — if the two are indistinguishable
    // in the data, whatever catch was described didn't come from it.
    // Flagging the top pick against itself is likewise dropped.
    const byId = new Map(products.map((p) => [p.productId, p]));
    const tradeoffCandidate =
      verdict.tradeoffId && verdict.tradeoffId !== bestOverallId
        ? byId.get(verdict.tradeoffId)
        : undefined;
    const tradeoffNote = tradeoffCandidate
      ? sanitizeReason(verdict.tradeoffNote)
      : null;
    const topPick = bestOverallId ? byId.get(bestOverallId) : undefined;
    const tradeoffIsReal =
      Boolean(tradeoffCandidate) &&
      Boolean(tradeoffNote) &&
      (!topPick || differsMeaningfully(tradeoffCandidate!, topPick));

    return {
      leadIn: sanitizeReason(verdict.leadIn),
      bestOverallId,
      bestOverallReason: bestOverallId
        ? sanitizeReason(verdict.bestOverallReason)
        : null,
      bestValueId,
      bestValueReason: bestValueId
        ? sanitizeReason(verdict.bestValueReason)
        : null,
      nearestId,
      tradeoff:
        tradeoffIsReal && tradeoffCandidate && tradeoffNote
          ? { productId: tradeoffCandidate.productId, note: tradeoffNote }
          : null,
    };
  } catch (err) {
    console.error("[search] recommendation call failed, skipping:", err);
    return null;
  }
}
