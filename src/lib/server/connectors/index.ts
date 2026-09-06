import { serperConnector } from "@/lib/server/connectors/serper";
import type { ExternalConnector } from "@/lib/server/connectors/types";
import type { ExternalOffer } from "@/types/search";
import { isVagueReference } from "@/lib/productTerm";
import { parseOfferPrice } from "@/lib/priceText";

export type { ExternalConnector } from "@/lib/server/connectors/types";

// Phase 4's orchestrator — the one place that decides WHETHER external
// sources run and merges what they return. Connectors themselves stay
// dumb (see types.ts), so adding Konga or a Jumia affiliate feed later is
// a new file plus one line in this array.
const CONNECTORS: ExternalConnector[] = [serperConnector];

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
export async function fetchExternalOffers(params: {
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
  // on, just for a price ceiling instead of a vendor claim. Only ever
  // drops a PARSEABLE price that's actually over budget — see
  // parseOfferPrice's own strictness note on why a range or an unreadable
  // price is kept rather than guessed at: an offer this can't judge is not
  // the same as one it knows is over.
  maxBudgetNaira?: number;
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
      const key = titleKey(offer.title);
      if (!key || seen.has(key)) continue;
      // The one hard filter this orchestrator applies itself, same spirit
      // as verifyOfferMatches' kind-of-item gate downstream in route.ts: a
      // buyer who named a ceiling is not shown something priced above it,
      // whatever else about the listing fits. Checked BEFORE `seen.add` so
      // an over-budget duplicate never blocks a later, cheaper listing of
      // the same title from a different source.
      if (params.maxBudgetNaira != null) {
        const price = parseOfferPrice(offer.priceText);
        if (price != null && price > params.maxBudgetNaira) continue;
      }
      seen.add(key);
      merged.push(offer);
      // Only short-circuit early when there's no budget to weigh. With one,
      // the confirmed-price-first sort below needs to see every candidate
      // that passed the filter above, not just the first `limit` of them in
      // encounter order — otherwise a run of price-less listings could fill
      // every slot before a verified-affordable one further down the
      // connector's results was ever compared against them.
      if (params.maxBudgetNaira == null && merged.length >= limit) {
        return merged;
      }
    }
  }

  if (params.maxBudgetNaira == null) return merged.slice(0, limit);

  // A CONFIRMED in-budget price outranks a listing this can't verify at
  // all (no price shown, or a range parseOfferPrice won't guess at) — found
  // live: a buyer who gave a ₦400k budget got back two listings with no
  // price on either one, shown with exactly the same confidence a verified
  // match would have had. Everything in `merged` already cleared the budget
  // filter above (nothing over budget survives it), so this is purely a
  // presentation order, never a second filter — an unpriced listing is
  // still shown, just after anything that could actually be confirmed.
  const withPrice: ExternalOffer[] = [];
  const withoutPrice: ExternalOffer[] = [];
  for (const offer of merged) {
    (parseOfferPrice(offer.priceText) != null ? withPrice : withoutPrice).push(
      offer,
    );
  }
  return [...withPrice, ...withoutPrice].slice(0, limit);
}
