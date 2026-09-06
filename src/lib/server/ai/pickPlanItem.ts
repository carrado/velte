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

/**
 * Resolves ONE checklist item — "Bed", "Refrigerator" — to a real, priced,
 * verified listing. Reused for the initial plan build, the "Replace this
 * item" edit, and the over-budget trim pass (called again there with a
 * lower `targetBudgetKobo`) — one function, three call sites, so the
 * selection rule can never drift between them.
 *
 * Never throws. A search or verification failure on either source degrades
 * to whatever the OTHER source found, and total failure resolves to
 * `no_match` — the honest empty state the product spec is explicit about,
 * never a fabricated pick.
 */
export async function resolvePlanItem(params: {
  label: string;
  /** null when the buyer's overall budget didn't stretch to give this item
   *  its own figure — still searched, just with no ceiling to filter by. */
  targetBudgetKobo: number | null;
  buyerLocation?: BuyerLocation;
  locationLabel?: string;
  /** The currently-selected pick, when this is a "Replace" re-resolution —
   *  excluded from the new candidate set so a re-search can't just hand
   *  back the exact same listing as "replaced". Omitted for a first-time
   *  resolution. */
  excludeProductId?: string | null;
  excludeExternalOfferId?: string | null;
}): Promise<ResolvedPlanItem> {
  const {
    label,
    targetBudgetKobo,
    buyerLocation,
    locationLabel,
    excludeProductId,
    excludeExternalOfferId,
  } = params;
  const targetBudgetNaira =
    targetBudgetKobo != null ? targetBudgetKobo / 100 : undefined;

  const candidates: Candidate[] = [];

  let velteWasStrong = false;
  try {
    const velte = await searchProductsCore(
      {
        product: label,
        maxBudgetNaira: targetBudgetNaira,
      },
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

  // Only worth the round trip when Velte didn't already give a strong,
  // direct match — mirrors the same "Velte first, external only for gaps"
  // ordering the rest of the search flow already uses, and saves a Serper
  // call (real cost) on every item Velte already covers well.
  if (!velteWasStrong) {
    try {
      const offers = await fetchExternalOffers({
        query: label,
        maxBudgetNaira: targetBudgetNaira,
      });
      if (offers.length) {
        const { kept } = await verifyOfferMatches({ query: label, offers });
        for (const o of kept) {
          if (excludeExternalOfferId && o.id === excludeExternalOfferId)
            continue;
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
      }
    } catch (err) {
      console.error(
        `[shopping-plan] external search failed for "${label}":`,
        err,
      );
    }
  }

  if (!candidates.length) return NO_MATCH;

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

  return winner.toResolved();
}
