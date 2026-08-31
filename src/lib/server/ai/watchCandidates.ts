import { koboFromPriceText } from "@/lib/priceText";
import type {
  ExternalOffer,
  SearchRecommendation,
  VendorMatch,
  WatchCandidate,
} from "@/types/search";

// WHICH products Velte offers to watch the price of (2026-08-29).
//
// Replaces the per-card "Watch price" button. That button put the offer on
// every card equally, which made it chrome: the buyer had to decide, for each
// of ten results, whether this was the one worth watching. Velte has already
// done that comparison one block above — so it should say so.
//
// The division of labour is the same one recommendResults.ts uses and that
// this whole pipeline is built on: **the model judges fit, code decides
// everything checkable.** Everything in this file is checkable, so none of it
// is left to the model. It cannot know whether a service is quote-only,
// whether this buyer is already watching something, or how much quota their
// plan has left — and a confident offer to watch an unwatchable listing is
// exactly the failure this split exists to prevent. The model's only job
// downstream is the sentence it says.

/** At most this many offered at once.
 *
 *  Five (raised from three, per explicit product direction 2026-08-29).
 *
 *  The recommendation only ever names THREE products — top pick, best value,
 *  nearest — so raising this number alone would have changed nothing. The
 *  fill step below is what actually makes 4 and 5 reachable: once the picks
 *  are in, the remaining slots take the most expensive eligible listings left
 *  in the turn, which is where an alert is worth most (see
 *  MIN_WATCHABLE_KOBO's own note on the economics).
 *
 *  Worth knowing at this size: Velte Plus allows 20 watches, so a buyer who
 *  accepts every offer in full reaches their ceiling in four searches. That
 *  is handled rather than prevented — the flow saves what it can and says
 *  plainly what it couldn't (see SearchHome's watchReply) — but if buyers
 *  start hitting `limit_reached` routinely, this number is the first thing
 *  to look at, not the plan. */
export const MAX_WATCH_CANDIDATES = 5;

/** Below this, an alert is worth less than the quota slot it occupies.
 *
 *  The economics are in PriceWatch.model.js: one alert catching an ₦80,000
 *  drop pays for two years of Plus. Inverted, a ₦4,000 charger dropping 10%
 *  saves ₦400 — real, and not worth spending one of twenty slots on, nor
 *  interrupting to offer.
 *
 *  A business input rather than a technical one, hence a named constant:
 *  raise it if watch slots start feeling scarce, lower it if buyers ask to
 *  watch cheaper things than this allows. */
export const MIN_WATCHABLE_KOBO = 10_000 * 100; // ₦10,000

/** Velte-side eligibility. Every clause is a hard fact, not a judgment.
 *
 *  `quoteOnRequest` is the one worth spelling out: those carry a placeholder
 *  price of 0 (see VendorMatch), and PriceWatch requires a real
 *  `startPriceKobo`. A watch on one could never fire, because there is no
 *  starting number to have fallen from. */
function velteCandidate(match: VendorMatch): WatchCandidate | null {
  if (match.quoteOnRequest) return null;
  // Naira are stored as a plain number on a match; kobo is what every money
  // field downstream speaks.
  const priceKobo = Math.round(match.price * 100);
  if (!Number.isFinite(priceKobo) || priceKobo <= 0) return null;
  if (priceKobo < MIN_WATCHABLE_KOBO) return null;
  return {
    kind: "velte",
    id: match.productId,
    productId: match.productId,
    url: null,
    label: match.name,
    imageUrl: match.mainImageUrl,
    merchant: match.vendorName,
    priceKobo,
  };
}

/** Prices that name a FLOOR rather than a price: "From ₦89,500", "Starting
 *  at ₦120,000", "As low as ₦45,000".
 *
 *  These have to be excluded explicitly, and it is worth being precise about
 *  why the existing parser doesn't already do it. `parseOfferPrice` refuses a
 *  string holding two or more numbers, which correctly kills a written-out
 *  range ("₦80,000 – ₦120,000") — but "From ₦89,500" holds exactly ONE
 *  number and parses perfectly happily to ₦89,500.
 *
 *  That number is not what the buyer would pay; it is the cheapest variant on
 *  a multi-variant listing. Watching it means alerting on a "drop" from a
 *  figure nobody was ever charged — a false alert, in the one feature Velte
 *  Plus is sold on, where a single wrong alert costs more trust than ten
 *  right ones earn. */
const FLOOR_PRICE_PATTERN =
  /\b(?:from|starting(?:\s+(?:at|from))?|as\s+low\s+as|min(?:imum)?)\b/i;

/** External-listing eligibility. */
function externalCandidate(offer: ExternalOffer): WatchCandidate | null {
  if (!offer.url) return null;
  if (offer.priceText && FLOOR_PRICE_PATTERN.test(offer.priceText)) return null;
  const priceKobo = koboFromPriceText(offer.priceText);
  if (priceKobo == null || priceKobo < MIN_WATCHABLE_KOBO) return null;
  return {
    kind: "external",
    id: offer.id,
    productId: null,
    url: offer.url,
    label: offer.title,
    imageUrl: offer.imageUrl,
    merchant: offer.merchant,
    priceKobo,
  };
}

/**
 * The products worth offering to watch on this turn.
 *
 * Drawn from the turn's RECOMMENDATION rather than its full result list, per
 * explicit product direction. Two reasons, and the second is the stronger:
 *
 *   1. Those candidates already earned their place — the model has just
 *      argued on screen why each is the top pick / best value / nearest, so
 *      offering to watch exactly those reads as the same thought continuing,
 *      not a second, unrelated ask.
 *   2. They are the products the buyer has just been given a reason to care
 *      about, so they belong at the front of any list of what to track.
 *
 * Order follows the picks block itself (top pick, best value, nearest) so the
 * thumbnails read in the order the buyer has just read the reasons. Remaining
 * slots up to MAX_WATCH_CANDIDATES are then filled from the turn's other
 * eligible listings, most expensive first. Deduplicated by id throughout: one
 * product routinely wins two badges, and a filled slot must never repeat a
 * pick.
 *
 * Returns an empty array whenever there is nothing genuinely watchable, and
 * every caller must treat that as "say nothing" rather than "offer anyway" —
 * an offer with no eligible target is worse than no offer.
 */
export function watchCandidatesFor(
  recommendation: SearchRecommendation | null,
  products: VendorMatch[],
  offers: ExternalOffer[] = [],
): WatchCandidate[] {
  if (!recommendation) return [];

  const byId = new Map<string, WatchCandidate>();
  for (const match of products) {
    const candidate = velteCandidate(match);
    if (candidate) byId.set(candidate.id, candidate);
  }
  for (const offer of offers) {
    const candidate = externalCandidate(offer);
    if (candidate) byId.set(candidate.id, candidate);
  }

  // The picks, in the order they are argued on screen. `nearest` is included
  // even when the picks block itself suppresses its row as redundant — the
  // dedup below collapses that case anyway, and leaving it out would drop a
  // genuinely watchable product on turns where it won nothing else.
  const ordered = [
    recommendation.bestOverallId,
    recommendation.bestValueId,
    recommendation.nearestId,
  ];

  const picked: WatchCandidate[] = [];
  const seen = new Set<string>();
  for (const id of ordered) {
    if (!id || seen.has(id)) continue;
    const candidate = byId.get(id);
    if (!candidate) continue;
    seen.add(id);
    picked.push(candidate);
    if (picked.length >= MAX_WATCH_CANDIDATES) break;
  }

  // Fill any remaining slots from the rest of the turn's eligible listings,
  // most expensive first.
  //
  // The picks keep their places at the front: they are the ones Velte has
  // just argued for on screen, so they read as the same thought continuing,
  // and demoting them below a pricier also-ran would break that. What follows
  // is ordered by price because that is where an alert is worth most — a 10%
  // move on the dearest thing in the turn saves more than a 10% move on
  // anything under it, and price is the only volatility proxy available at
  // this point (nothing here knows a listing's history).
  //
  // Ties broken by nothing in particular: `sort` is stable in every runtime
  // this ships to, so equal prices keep result order, which is at least a
  // reason rather than a coin flip.
  if (picked.length < MAX_WATCH_CANDIDATES) {
    const rest = [...byId.values()]
      .filter((candidate) => !seen.has(candidate.id))
      .sort((a, b) => b.priceKobo - a.priceKobo);
    for (const candidate of rest) {
      picked.push(candidate);
      if (picked.length >= MAX_WATCH_CANDIDATES) break;
    }
  }

  return picked;
}
