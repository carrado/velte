import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import { fetchExternalOffers } from "@/lib/server/connectors";
import { verifyOfferMatches } from "@/lib/server/ai/verifyMatches";
import { parseOfferPrice } from "@/lib/priceText";
import type { BuyerLocation, ShoppingPlanItemStatus } from "@/types/search";

// Shopping Plan's per-item resolution (2026-09-06) — the "search Velte
// first, fill the gap externally" step from the product spec, built almost
// entirely out of infrastructure that already exists:
//
//   - searchProductsCore already does the full local→nearby→state→
//     nationwide cascade AND its own kind-of-item verification (gated to
//     "similar"-quality matches — see that file's own comment on why
//     "direct" skips it). Nothing new needed there.
//   - fetchExternalOffers already budget-filters against a naira ceiling.
//     It does NOT verify kind-of-item on its own (same division route.ts's
//     own external-offer branches already use), so that call still happens
//     here, explicitly, before a single external candidate is trusted.
//
// The only genuinely new code is the SELECTION rule below — deliberately
// small and deterministic, never model-judged: cheapest verified candidate
// wins, with a fixed tie-break toward Velte. "Model translates, code
// decides" applies here exactly as it does everywhere else in this
// codebase — there is no LLM call in this file.

/** How much cheaper an external offer has to be before it beats an
 *  otherwise-equal Velte listing. Codifies the product spec's "Velte-native
 *  vendors get priority" as an actual number rather than a vague
 *  preference: a Velte vendor within 10% of the cheapest external price
 *  still wins, since that's real money kept inside Velte's own network for
 *  a difference a buyer is unlikely to notice. */
const VELTE_PREFERENCE_BAND = 0.1;

export interface ResolvedPlanItem {
  status: ShoppingPlanItemStatus;
  source: "velte" | "external" | null;
  productId: string | null;
  vendorId: string | null;
  externalOfferId: string | null;
  name: string | null;
  imageUrl: string | null;
  priceKobo: number | null;
  merchant: string | null;
  url: string | null;
}

const NO_MATCH: ResolvedPlanItem = {
  status: "no_match",
  source: null,
  productId: null,
  vendorId: null,
  externalOfferId: null,
  name: null,
  imageUrl: null,
  priceKobo: null,
  merchant: null,
  url: null,
};

interface Candidate {
  source: "velte" | "external";
  priceKobo: number;
  toResolved: () => ResolvedPlanItem;
}

/** How many of an item's verified candidates are kept alongside the pick.
 *  Every one of these is a REAL, already-verified listing this same search
 *  returned — the cap is about keeping the plan document bounded (same
 *  reasoning SearchConversation's MAX_TURNS holds to), never about padding a
 *  count. Mirrored by velte-backend's own MAX_RESULTS_PER_ITEM, which
 *  re-caps defensively on write. */
const MAX_RESULTS_PER_ITEM = 12;

/** One of an item's alternatives — the same display snapshot shape the
 *  chosen pick carries, minus the status/error fields that only make sense
 *  for the item itself. */
export type PlanItemResult = Omit<ResolvedPlanItem, "status"> & {
  source: "velte" | "external";
};

export interface CollectedPlanItem {
  /** The pick, by the same rule as before — index 0 of `results`. */
  picked: ResolvedPlanItem;
  /** Every verified candidate, cheapest-first within the Velte-preference
   *  ordering, pick first. Empty for a no_match. */
  results: PlanItemResult[];
}

/**
 * Resolves ONE checklist item — "Bed", "Refrigerator" — to a real, priced,
 * verified listing, AND keeps the rest of what it found (2026-09-10) so the
 * plan can honestly say "6 results found" and let the buyer open the item
 * and choose differently. Reused for the initial plan build, the "Replace
 * this item" edit, and the over-budget trim pass (called again there with a
 * lower `targetBudgetKobo`) — one function, three call sites, so the
 * selection rule can never drift between them.
 *
 * Never throws. A search or verification failure on either source degrades
 * to whatever the OTHER source found, and total failure resolves to
 * `no_match` — the honest empty state the product spec is explicit about,
 * never a fabricated pick. (A THROWN failure is a different thing entirely
 * and is the caller's to record as `failed` — see the plan route's own
 * per-item try/catch.)
 */
export async function collectPlanItem(params: {
  label: string;
  /** The item's own planning allocation, in kobo — informational only
   *  (2026-09-11, was a hard search ceiling until then). Per explicit
   *  request: a shopping plan must never dead-end an item just because
   *  everything real that exists for it costs more than the buyer
   *  budgeted — the honest thing is to still show the real, verified
   *  listing and let the plan's own total surface as over budget (see
   *  ShoppingPlanTemplate.tsx's own `overBudget` banner, and route.ts's
   *  removed trim-to-fit pass). Kept on the param and the checklist item
   *  itself purely as a display figure ("Budget: ₦X" per item) — no
   *  longer forwarded to searchProductsCore/fetchExternalOffers as
   *  `maxBudgetNaira`. The selection rule below still naturally prefers
   *  a cheaper match when one genuinely exists (cheapest-first, Velte
   *  preference band) — this only stops it from REFUSING a real, pricier
   *  one when that's all there is. */
  targetBudgetKobo: number | null;
  buyerLocation?: BuyerLocation;
  locationLabel?: string;
  /** The currently-selected pick, when this is a "Replace" re-resolution —
   *  excluded from the new candidate set so a re-search can't just hand
   *  back the exact same listing as "replaced". Omitted for a first-time
   *  resolution. */
  excludeProductId?: string | null;
  excludeExternalOfferId?: string | null;
}): Promise<CollectedPlanItem> {
  const {
    label,
    buyerLocation,
    locationLabel,
    excludeProductId,
    excludeExternalOfferId,
  } = params;

  const candidates: Candidate[] = [];

  let velteWasStrong = false;
  try {
    const velte = await searchProductsCore(
      { product: label },
      { buyerLocation, locationLabel },
    );
    if ("results" in velte) {
      velteWasStrong =
        velte.matchQuality === "direct" && velte.results.length > 0;
      for (const m of velte.results) {
        if (excludeProductId && m.productId === excludeProductId) continue;
        const priceKobo = Math.round(m.price * 100);
        candidates.push({
          source: "velte",
          priceKobo,
          toResolved: () => ({
            status: "found",
            source: "velte",
            productId: m.productId,
            vendorId: m.vendorId,
            externalOfferId: null,
            name: m.name,
            imageUrl: m.mainImageUrl,
            priceKobo,
            merchant: m.vendorName,
            url: null,
          }),
        });
      }
    }
  } catch (err) {
    console.error(`[shopping-plan] Velte search failed for "${label}":`, err);
  }

  // Extensive external search, and never a scraper (2026-09-11). "Extensive"
  // here means squeezing more out of the ONE legitimate, paid source this
  // codebase already trusts (Serper's Google Shopping + Google Search APIs
  // — see connectors/serper.ts's own header) rather than reaching for raw
  // HTML scraping of marketplace pages: scraping is fragile (breaks on
  // every markup change), routinely against the target site's own terms,
  // and this codebase already parked exactly that idea once before as too
  // risky for what it would buy (see the Jumia-fallback note). A Shopping
  // Plan item is a background job with no buyer staring at a spinner, so it
  // can afford to ask harder than a live chat dead-end would: a bigger
  // result window per query, and — new — one broadened retry with a
  // simplified query before conceding no_match, rather than giving up the
  // instant the first, most literal phrasing comes back empty.
  const EXTERNAL_LIMIT = 15;

  async function searchExternal(query: string) {
    const offers = await fetchExternalOffers({
      query,
      limit: EXTERNAL_LIMIT,
      // No maxBudgetNaira — see this function's own top comment on why a
      // Shopping Plan item is never hard-filtered out of existence by price.
    });
    if (!offers.length) return [] as const;
    const { kept } = await verifyOfferMatches({ query, offers });
    return kept;
  }

  // Only worth the round trip when Velte didn't already give a strong,
  // direct match — mirrors the same "Velte first, external only for gaps"
  // ordering the rest of the search flow already uses, and saves a Serper
  // call (real cost) on every item Velte already covers well.
  if (!velteWasStrong) {
    try {
      let kept = await searchExternal(label);
      // Broaden once: a multi-word checklist label ("Executive office
      // chair") can be too specific for what a merchant actually titled
      // their listing. Retried on just the last word — cheap, deterministic,
      // no model call — rather than conceding no_match off one phrasing.
      if (!kept.length) {
        const words = label.trim().split(/\s+/);
        const broadened = words[words.length - 1];
        if (
          words.length > 1 &&
          broadened.toLowerCase() !== label.toLowerCase()
        ) {
          kept = await searchExternal(broadened);
        }
      }
      for (const o of kept) {
        if (excludeExternalOfferId && o.id === excludeExternalOfferId) continue;
        const naira = parseOfferPrice(o.priceText);
        if (naira == null) continue; // no usable price — can't compare or select on it
        const priceKobo = Math.round(naira * 100);
        candidates.push({
          source: "external",
          priceKobo,
          toResolved: () => ({
            status: "found",
            source: "external",
            productId: null,
            vendorId: null,
            externalOfferId: o.id,
            name: o.title,
            imageUrl: o.imageUrl,
            priceKobo,
            merchant: o.merchant,
            url: o.url,
          }),
        });
      }
    } catch (err) {
      console.error(
        `[shopping-plan] external search failed for "${label}":`,
        err,
      );
    }
  }

  if (!candidates.length) return { picked: NO_MATCH, results: [] };

  const cheapest = candidates.reduce((min, c) =>
    c.priceKobo < min.priceKobo ? c : min,
  );
  const cheapestVelte = candidates
    .filter((c) => c.source === "velte")
    .reduce<Candidate | null>(
      (min, c) => (!min || c.priceKobo < min.priceKobo ? c : min),
      null,
    );

  // Velte wins outright if it's already the cheapest, OR if it's within
  // the preference band of whatever the true cheapest (external) option is.
  const winner =
    cheapestVelte &&
    (cheapestVelte === cheapest ||
      cheapestVelte.priceKobo <=
        cheapest.priceKobo * (1 + VELTE_PREFERENCE_BAND))
      ? cheapestVelte
      : cheapest;

  // Pick first, then everything else cheapest-first. Deliberately the same
  // candidate objects the selection rule above just ranked — not a second,
  // independently-sorted list that could disagree with which one "won".
  const ordered = [
    winner,
    ...candidates
      .filter((c) => c !== winner)
      .sort((a, b) => a.priceKobo - b.priceKobo),
  ].slice(0, MAX_RESULTS_PER_ITEM);

  return {
    picked: winner.toResolved(),
    results: ordered.map((c) => {
      // Reuses each candidate's own snapshot builder rather than
      // re-deriving the display fields — one source of truth for what a
      // listing looks like, whichever source it came from. `status` is the
      // only field that belongs to the ITEM rather than to a listing, so it
      // is the one thing not carried over.
      const r = c.toResolved();
      return {
        source: c.source,
        productId: r.productId,
        vendorId: r.vendorId,
        externalOfferId: r.externalOfferId,
        name: r.name,
        imageUrl: r.imageUrl,
        priceKobo: r.priceKobo,
        merchant: r.merchant,
        url: r.url,
      };
    }),
  };
}

/**
 * The pick alone, for callers that only ever replace ONE selection and have
 * no use for the alternatives — the "Replace this item" edit. A thin wrapper
 * rather than a second implementation, so the selection rule stays in
 * exactly one place.
 */
export async function resolvePlanItem(
  params: Parameters<typeof collectPlanItem>[0],
): Promise<ResolvedPlanItem> {
  const { picked } = await collectPlanItem(params);
  return picked;
}
