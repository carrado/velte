import { serperConnector } from "@/lib/server/connectors/serper";
import { jijiConnector } from "@/lib/server/connectors/jiji";
import { buildSearchLinks } from "@/lib/server/connectors/searchLinks";
import type { ExternalConnector } from "@/lib/server/connectors/types";
import type { ExternalOffer } from "@/types/search";
import { isVagueReference } from "@/lib/productTerm";
import { parseOfferPrice } from "@/lib/priceText";

export type { ExternalConnector } from "@/lib/server/connectors/types";

// Phase 4's orchestrator — the one place that decides WHETHER external
// sources run and merges what they return. Connectors themselves stay
// dumb (see types.ts), so adding another Shopify/WooCommerce feed later is
// a new file plus one line in this array. jijiConnector added 2026-09-21,
// replacing what used to be a single hardcoded link serperConnector always
// appended — see that file's own header for why Jiji earned a real,
// dedicated connector rather than staying a one-line afterthought inside
// Serper's.
const CONNECTORS: ExternalConnector[] = [serperConnector, jijiConnector];

// Ceiling on what a dead end shows. This is a consolation list, not a
// catalogue — a wall of thirty off-Velte links buries the "here's what to
// do next" message and reads like giving up.
const MAX_OFFERS = 6;

/** True when at least one connector is configured — lets callers skip the
 *  status line and the whole code path on an install with no keys. */
export function hasExternalConnectors(): boolean {
  return CONNECTORS.some((c) => c.isEnabled());
}

// Near-duplicate detection across sources. Same product listed by two
// merchants (or the same merchant twice with different tracking URLs) is
// one offer to a buyer. Deliberately crude — lowercase, strip punctuation,
// collapse whitespace, take the first several words — because the cost of
// wrongly merging two similar listings is far lower here than the cost of
// showing the buyer the same phone five times.
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

/**
 * Runs every configured connector for `query` and returns a merged,
 * deduplicated, capped list. Never throws and never rejects: a failing
 * source contributes an empty list, and all sources failing is simply an
 * empty result — indistinguishable, to the buyer, from Velte having had no
 * fallback to offer, which is exactly the pre-Phase-4 behaviour.
 *
 * IMPORTANT: this does not decide when it is appropriate to show external
 * results — the caller does. Velte's own vendors always come first, and
 * these only ever appear when Velte itself had nothing. That ordering is
 * the product, not a detail: the business is the vendor handoff, and this
 * is the consolation that keeps a dead end from being a dead stop.
 */
async function fetchListings(params: {
  query: string;
  country?: string;
  limit?: number;
  // The buyer's stated ceiling, in plain naira (2026-09-05) — when set, a
  // budget applies to OFF-PLATFORM results exactly as hard as it already
  // applies to Velte's own catalogue (see searchProductsTool.ts's own
  // maxBudgetNaira comment: "a real, code-enforced price filter... never
  // just prose riding along in the query text"). Without this, a dead end
  // could hand a buyer who said "under ₦400k" a Google Shopping result
  // priced at ₦900k with nothing marking it as out of range — the exact
  // "the model translates, the data decides" rule this whole product runs
  // on, just for a price ceiling instead of a vendor claim.
  //
  // NOT a hard drop (2026-09-22, reversed — see this function's own body):
  // a within-budget/unpriced listing is always preferred, but an over-budget
  // one only gets left out while there's enough affordable to fill the list
  // without it — never leaving a buyer with nothing shown just because
  // nothing genuinely fit their number. See parseOfferPrice's own
  // strictness note on why a range or an unreadable price is never treated
  // as over budget either: an offer this can't judge is not the same as one
  // it knows is over.
  maxBudgetNaira?: number;
  // The place name the buyer's own words named, if any (e.g. "Anambra") —
  // see ExternalConnector.search's own comment on this field for the live
  // bug it fixes and why it's a NAME, never a raw coordinate. Threaded
  // straight through to every connector unchanged; this orchestrator has no
  // location logic of its own to apply, same as it has none for the query
  // text itself.
  location?: string | null;
}): Promise<ExternalOffer[]> {
  const enabled = CONNECTORS.filter((c) => c.isEnabled());
  // See isVagueReference's own comment — "all of them"/"the best" carry no
  // real product signal, and asking Google Shopping/Search for one anyway
  // returns whatever ranks well generically for that vague text, not
  // anything related to what the buyer actually meant.
  if (
    !enabled.length ||
    !params.query.trim() ||
    isVagueReference(params.query)
  ) {
    return [];
  }

  const limit = params.limit ?? MAX_OFFERS;
  // Over-fetch when there's a budget to filter by. Each connector's own
  // `limit` has no notion of price, so asking for exactly `limit` results
  // and THEN dropping the over-budget ones among them can leave fewer than
  // `limit` shown even when the underlying market genuinely has enough
  // that fit — this gives the filter below real headroom to still fill the
  // list instead of quietly returning a thinner one.
  const fetchLimit = params.maxBudgetNaira != null ? limit * 2 : limit;

  const settled = await Promise.allSettled(
    enabled.map((c) =>
      c.search({
        query: params.query,
        country: params.country,
        location: params.location,
        limit: fetchLimit,
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: ExternalOffer[] = [];
  for (const result of settled) {
    // A connector that threw despite the contract still can't take the
    // turn down — allSettled plus this guard is the belt to that braces.
    if (result.status !== "fulfilled") {
      console.error("[connectors] a connector rejected:", result.reason);
      continue;
    }
    for (const offer of result.value) {
      // Real listings only — "search this site" links are built once,
      // below, by buildSearchLinks, not per connector.
      if (!offer.isDirectLink) continue;
      const key = titleKey(offer.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(offer);
      // Only short-circuit early when there's no budget to weigh. With one,
      // every candidate has to be collected first — the within/over-budget
      // split below needs the WHOLE set, not just the first `limit` of them
      // in encounter order.
      if (params.maxBudgetNaira == null && merged.length >= limit) {
        return merged;
      }
    }
  }

  if (params.maxBudgetNaira == null) return merged.slice(0, limit);

  // BUDGET IS A PREFERENCE ORDER, NOT A HARD DROP (2026-09-22, explicit
  // product decision reversing the prior "over budget is dropped entirely"
  // rule) — found live: a ₦100k birthday-cake budget with nothing genuinely
  // available under it came back with NOTHING at all, because every real
  // listing above the ceiling was silently discarded here, leaving only
  // Jiji's own always-there search-link fallback. A buyer is better served
  // by seeing what's actually out there, clearly marked as over budget, than
  // by a dead end that hides real options that exist. `overBudget` is never
  // a second filter on top of this — it's the flag `ExternalOfferCard` reads
  // to label a listing honestly rather than let a buyer discover the
  // mismatch only after tapping through.
  //
  // A CONFIRMED in-budget price still outranks a listing this can't verify
  // at all (no price shown, or a range parseOfferPrice won't guess at) —
  // found live: a buyer who gave a ₦400k budget got back two listings with
  // no price on either one, shown with exactly the same confidence a
  // verified match would have had. An unparseable price is never treated as
  // over budget either (parseOfferPrice's own strictness note: a range or
  // an unreadable price is kept rather than guessed at — an offer this
  // can't judge is not the same as one it knows is over).
  const withinBudget: ExternalOffer[] = [];
  const unpriced: ExternalOffer[] = [];
  const overBudget: ExternalOffer[] = [];
  for (const offer of merged) {
    const price = parseOfferPrice(offer.priceText);
    if (price == null) unpriced.push(offer);
    else if (price <= params.maxBudgetNaira) withinBudget.push(offer);
    else overBudget.push(offer);
  }
  const affordable = [...withinBudget, ...unpriced];
  if (affordable.length >= limit) return affordable.slice(0, limit);

  // Not enough that fit — fill the remaining slots with the cheapest
  // over-budget listings rather than leaving the list thinner than it needs
  // to be, each one marked so the buyer sees the mismatch on the card
  // itself, before ever tapping through.
  const overBudgetSorted = overBudget
    .slice()
    .sort(
      (a, b) =>
        (parseOfferPrice(a.priceText) ?? Infinity) -
        (parseOfferPrice(b.priceText) ?? Infinity),
    )
    .slice(0, limit - affordable.length)
    .map((offer) => ({ ...offer, overBudget: true }));
  return [...affordable, ...overBudgetSorted];
}

/**
 * Real listings (see fetchListings above), followed by "keep looking
 * yourself" search links for the sites that fit the query (see
 * connectors/searchLinks.ts) — always last, never counted against the
 * listing cap, and always `isDirectLink: false`, which is how route.ts and
 * SearchHome keep them from ever reading as a result.
 */
export async function fetchExternalOffers(
  params: Parameters<typeof fetchListings>[0],
): Promise<ExternalOffer[]> {
  const listings = await fetchListings(params);
  if (
    !hasExternalConnectors() ||
    !params.query.trim() ||
    isVagueReference(params.query)
  ) {
    return listings;
  }
  return [...listings, ...buildSearchLinks(params.query, params.location)];
}
