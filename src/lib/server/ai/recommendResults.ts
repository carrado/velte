import { tool } from "ai";
import { z } from "zod";
import type { UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import { parseOfferPrice } from "@/lib/priceText";
import type {
  ExternalOffer,
  SearchRecommendation,
  VendorMatch,
} from "@/types/search";

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

// The external twin's own cap. Longer than the Velte one because that call
// is text-only while this one hands the provider up to a dozen listing
// photos, which it FETCHES itself before it can answer — the same reason
// verifyMatches runs a wider window than this file's original 8s. Still far
// inside the route's 60s budget, and a timeout here costs only the badges.
const EXTERNAL_RECOMMEND_TIMEOUT_MS = 12_000;

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
        "recommend-velte",
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

// ---------------------------------------------------------------------
// The same layer, for OFF-VELTE offers (2026-08-26).
//
// Reported: the picks and the badges only ever appeared on Velte results,
// so a dead-end turn — the one turn where the buyer has least to go on, and
// is choosing between six unfamiliar shops — got a bare grid with no help
// at all. That was never a decision, just a gap: pickRecommendation is
// built entirely around VendorMatch (distance, seller completeness, vendor
// attributes), none of which an external offer has.
//
// So this is a deliberately SMALLER comparison, sized to what these offers
// honestly carry — a title, a price string and a merchant name:
//
//   - "Best price" is computed IN CODE from the prices, never asked of the
//     model. It's a fact when it's a fact, and dropped entirely when fewer
//     than two offers carry a comparable price.
//   - "Top pick" is the model's judgment of which listing best matches what
//     the buyer described — the one genuinely useful thing a model adds
//     over six near-identical titles.
//   - "Nearest" is always null. There is no distance to an online listing,
//     and inventing one is exactly what this codebase doesn't do.
//   - The tradeoff survives under the same rule as the Velte version: it's
//     a CLAIM, so the flagged offer must actually differ from the top pick.
//
// Prices are parsed ONLY to order them. What the buyer sees stays the
// source's own string, untouched — see ExternalOffer's own comment.
// ---------------------------------------------------------------------

// Moved to lib/priceText.ts (2026-08-29) so the price-watch checker and
// the "Watch price" button — one of them a client component — can read a
// price the exact same way this comparison does. Re-exported rather than
// relocated outright so existing importers of this module keep working.
export { parseOfferPrice };

// A cheapness superlative. The model is told not to rank on price (that is
// computed separately) and still reaches for it: found live on "20000mah
// power bank", where the Top pick's reason ended "...at the lowest price"
// while a ₦7,499 listing sat two rows below its ₦14,510. Price order is one
// of the few things here that IS checkable, so a claim that contradicts it
// is dropped rather than shown.
const CHEAPEST_CLAIM =
  /\b(cheapest|lowest\s+price|best\s+price|most\s+affordable|least\s+expensive|lowest\s+cost)\b/i;

// How many photos of ONE listing go to the model. The whole point is to see
// past the flattering first shot, and a defect is usually in the first few
// that follow; past that the cost is real (every image is fetched by the
// provider) and the return is not.
const MAX_PHOTOS_PER_OFFER = 4;

// Bounds the whole call rather than one listing: six offers each carrying
// four photos is 24 image fetches in front of a waiting buyer. When a turn
// exceeds this, photos are spread across offers (see collectOfferPhotos) so
// no listing is judged blind while another gets four.
const MAX_PHOTOS_TOTAL = 12;

function offerSummary(offer: ExternalOffer, photoCount: number) {
  return {
    id: offer.id,
    title: offer.title,
    price: offer.priceText ?? "not shown",
    merchant: offer.merchant ?? "unknown shop",
    // The listing's own words. Worth including specifically because a
    // seller's "UK used", "Grade A" or "for parts" lands here — but it is
    // the seller talking, which the prompt says out loud.
    description: offer.description ?? null,
    // Announced so the model knows whether silence about condition means
    // "nothing visible" or "nothing was shown to me".
    photoCount,
  };
}

/** Photos to send for each offer, primary first, fairly rationed.
 *
 *  Fairness matters more than depth here: judging listing 1 from four
 *  photos and listing 5 from none would systematically favour whichever
 *  listing happened to be fetched first, which is exactly the bias this
 *  whole change exists to remove. So offers take one photo each in turn
 *  until the budget runs out, rather than the first offers taking all of
 *  it. */
function collectOfferPhotos(offers: ExternalOffer[]): Map<string, string[]> {
  const available = new Map<string, string[]>();
  for (const offer of offers) {
    const photos = [
      ...(offer.imageUrl ? [offer.imageUrl] : []),
      ...offer.galleryUrls,
    ].slice(0, MAX_PHOTOS_PER_OFFER);
    available.set(offer.id, photos);
  }

  const chosen = new Map<string, string[]>(offers.map((o) => [o.id, []]));
  let budget = MAX_PHOTOS_TOTAL;
  for (let round = 0; round < MAX_PHOTOS_PER_OFFER && budget > 0; round++) {
    for (const offer of offers) {
      if (budget <= 0) break;
      const photo = available.get(offer.id)?.[round];
      if (!photo) continue;
      chosen.get(offer.id)!.push(photo);
      budget -= 1;
    }
  }
  return chosen;
}

/** Do two offers differ in anything a buyer could act on? The external
 *  analogue of differsMeaningfully — the axes are just far fewer. */
function offersDiffer(a: ExternalOffer, b: ExternalOffer): boolean {
  return (
    a.priceText !== b.priceText ||
    a.merchant !== b.merchant ||
    a.title.trim().toLowerCase() !== b.title.trim().toLowerCase() ||
    // Added with the photo/description pass (2026-08-27): two listings can
    // carry the same title, price and shop and still differ in the only way
    // that now matters — what their photos and their seller's own words
    // show. Without this, a "the third photo shows a cracked screen" note
    // on an otherwise identical-looking listing would be discarded as a
    // fabricated difference, which is precisely backwards.
    a.description !== b.description ||
    a.galleryUrls.length !== b.galleryUrls.length
  );
}

/** Drops a reason that claims a listing is the cheapest when the prices say
 *  otherwise. Only the claim is dropped, never the pick itself — the model
 *  may well be right about FIT and merely wrong about price, and the card
 *  is better with a silent chip than a false sentence. */
function verifyPriceClaim(
  reason: string | null,
  pickId: string,
  cheapestId: string | null,
): string | null {
  if (!reason || !CHEAPEST_CLAIM.test(reason)) return reason;
  return pickId === cheapestId ? reason : null;
}

/** The model failed but the arithmetic didn't. A lone, code-verified "Best
 *  price" chip is still worth showing — unlike the Velte version's lone
 *  "Nearest", it's the single most useful thing about a row of unfamiliar
 *  shops. */
function cheapestOnly(cheapestId: string | null): SearchRecommendation | null {
  if (!cheapestId) return null;
  return {
    leadIn: null,
    bestOverallId: null,
    bestOverallReason: null,
    bestValueId: cheapestId,
    bestValueReason: "Lowest price of the listings shown.",
    nearestId: null,
    tradeoff: null,
  };
}

const EXTERNAL_SYSTEM_PROMPT = [
  "You compare online shopping listings for a buyer on Velte, a Nigerian vendor-discovery service.",
  "Velte itself had no vendor for this request, so these are OFF-PLATFORM listings from ordinary online shops — the buyer would be buying from those shops directly, not through Velte.",
  "You get the buyer's request and a JSON list of listings, each with a title, the price as the shop displayed it, the shop's name, the listing's own description where it published one, and how many of its photos you were given.",
  "The photos follow the list, each labelled with the listing number it belongs to. A listing often has several — they are the SAME item shown from different angles, not different items.",
  "",
  "Judge which listing best fits what the buyer actually asked for, and whether one of them carries a real catch worth flagging.",
  "",
  "LOOK AT EVERY PHOTO BEFORE YOU PICK. Sellers lead with their most flattering shot, so damage shows up in the later ones: a cracked or shattered screen, a deep scratch or dent, a missing part, heavy wear, an item clearly opened or used when sold as new. A listing whose later photos show damage must NOT be your top pick when a comparable undamaged one is available, however good its title and price look.",
  "Say what you actually saw. If you flag damage, name it and say which photo it was in — 'the third photo shows a cracked screen', never a vague 'may have issues'. If the photos show nothing wrong, do not invent a concern, and do not describe condition you could not see.",
  "Treat the description as the SELLER's own claim, not fact — 'no cracks', 'perfect condition' and 'grade A' are written by whoever is selling it. Where a photo and the description disagree, believe the photo and say so.",
  "",
  "Judge only from what you were given — the titles, prices, descriptions and photos. You know nothing about delivery, stock, warranty, authenticity, or how good any of these shops are — never imply otherwise, and never call a shop trusted, verified, official, reputable or reliable.",
  "Do NOT pick a best-value listing: that is computed from the prices separately, so pass null for bestValueId and bestValueReason.",
  "Keep the lead-in honest about what these are — they are not Velte vendors.",
  "",
  "Call the recommendResults tool exactly once with your verdict.",
].join("\n");

/**
 * The comparison for a dead-end turn's external offers. Same contract as
 * pickRecommendation: never throws, and any failure degrades to either the
 * code-computed price chip alone or plain cards.
 */
export async function pickExternalRecommendation(params: {
  query: string;
  offers: ExternalOffer[];
}): Promise<SearchRecommendation | null> {
  const { query, offers } = params;
  if (offers.length < 2) return null;

  // Code's half, computed first so it survives a failed model call.
  const priced = offers
    .map((o) => ({ offer: o, value: parseOfferPrice(o.priceText) }))
    .filter(
      (p): p is { offer: ExternalOffer; value: number } => p.value != null,
    );
  let cheapestId: string | null = null;
  if (priced.length >= 2) {
    const sorted = [...priced].sort((a, b) => a.value - b.value);
    // Only a claim when it's genuinely cheaper than the next one — two
    // listings at the same price have no "best price" to point at.
    if (sorted[0].value < sorted[1].value) cheapestId = sorted[0].offer.id;
  }

  // One photo budget for the whole call, rationed across the offers.
  const photosByOffer = collectOfferPhotos(offers);

  // The listing list, then each listing's photos announced by the same
  // number it carries in that list. The label before each image is what
  // makes a per-listing judgment possible at all — a bare run of images is
  // unattributable (same reasoning as verifyMatches' own layout).
  const content: UserContent = [];
  content.push({
    type: "text",
    text: `Buyer's request: "${query}"\n\nOnline listings:\n${JSON.stringify(
      offers.map((o) => offerSummary(o, photosByOffer.get(o.id)?.length ?? 0)),
      null,
      2,
    )}`,
  });

  let imageCount = 0;
  for (const [index, offer] of offers.entries()) {
    const photos = photosByOffer.get(offer.id) ?? [];
    for (const [photoIndex, photo] of photos.entries()) {
      let url: URL;
      try {
        url = new URL(photo);
      } catch {
        continue;
      }
      content.push({
        type: "text",
        text: `Listing ${index + 1} ("${offer.title.slice(0, 60)}") — photo ${
          photoIndex + 1
        } of ${photos.length}:`,
      });
      // The same non-deprecated multimodal shape verifyMatches and route.ts
      // use — `ImagePart` is deprecated in this SDK version.
      content.push({ type: "file", mediaType: "image", data: url });
      imageCount += 1;
    }
  }

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: EXTERNAL_SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
          tools: { recommendResults: recommendResultsTool() },
          toolChoice: "required",
        },
        // Groq is text-only, so it stays a fallback only while this
        // particular call carries no images — handing it one misbehaves
        // silently rather than failing loudly (verifyMatches' same note).
        imageCount > 0 ? ["openai"] : ["openai", "groq"],
        "recommend-external",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("external recommendation timed out")),
          EXTERNAL_RECOMMEND_TIMEOUT_MS,
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
          tradeoffId: string | null;
          tradeoffNote: string | null;
        }
      | undefined;
    if (!verdict) return cheapestOnly(cheapestId);

    const byId = new Map(offers.map((o) => [o.id, o]));
    const bestOverallId = byId.has(verdict.bestOverallId)
      ? verdict.bestOverallId
      : null;

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
      (!topPick || offersDiffer(tradeoffCandidate!, topPick));

    // The cheapest listing also being the best fit is the ordinary case,
    // not two findings — the card wears both chips and the picks block
    // shows one row, mirroring the Velte version's own bestValue rule.
    const bestValueId = cheapestId === bestOverallId ? null : cheapestId;
    if (!bestOverallId && !bestValueId) return null;

    return {
      leadIn: sanitizeReason(verdict.leadIn),
      bestOverallId,
      bestOverallReason: bestOverallId
        ? verifyPriceClaim(
            sanitizeReason(verdict.bestOverallReason),
            bestOverallId,
            cheapestId,
          )
        : null,
      bestValueId,
      // Written here, not by the model: this row exists because the numbers
      // say so, so it says exactly that and nothing more.
      bestValueReason: bestValueId
        ? "Lowest price of the listings shown."
        : null,
      nearestId: null,
      tradeoff:
        tradeoffIsReal && tradeoffCandidate && tradeoffNote
          ? { productId: tradeoffCandidate.id, note: tradeoffNote }
          : null,
    };
  } catch (err) {
    console.error("[search] external recommendation failed, skipping:", err);
    return cheapestOnly(cheapestId);
  }
}
