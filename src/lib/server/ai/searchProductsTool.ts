import { tool } from "ai";
import { z } from "zod";

import { buildProductTerm } from "@/lib/productTerm";
import { aiSearchData } from "@/lib/server/aiSearchBackend";
import { resolveSearchLocation } from "@/lib/server/ai/resolveBuyerCoords";
import {
  allowsNearbyBusinesses,
  looksLikeServiceTask,
} from "@/lib/server/ai/sectorClarifiers";
import {
  searchingPhrase,
  foundCountPhrase,
  directMatchPhrase,
  similarMatchPhrase,
  noProductMatchPhrase,
  checkingPhotosPhrase,
} from "@/lib/server/ai/statusPhrases";
import {
  rejectedMatchesNote,
  verifyItemMatches,
} from "@/lib/server/ai/verifyMatches";
import type {
  BuyerLocation,
  MatchTier,
  MatchQuality,
  NearbyBusiness,
  VendorMatch,
} from "@/types/search";

const inputSchema = z.object({
  product: z
    .string()
    .describe("The specific product or service the buyer is looking for."),
  // Found live: for a vague repair request naming no symptom at all ("fix
  // my Infinix Hot 50i phone"), the model started ENUMERATING plausible
  // things that might be wrong — "screen replacement", "battery",
  // "software" — none of which the buyer ever said, rendered back to the
  // SAME buyer moments later as if it were a direct quote of their own
  // request ("No match on Velte for 'Infinix Hot 50i repair phone screen
  // replacement battery software...'"). This is a narrower case of the
  // same rule CLAUDE.md states for the whole product: "the LLM never
  // invents ... those only ever come from the database" — an attribute is
  // data about what the BUYER said, not the model's own plausible-sounding
  // elaboration of what they might have meant, and the field's own
  // description below didn't say that clearly enough for a more
  // "thorough"/elaborative reasoning model to hold the line on its own.
  attributes: z
    .array(z.string())
    .optional()
    .describe(
      "Specific attributes — color, size, brand, material, style, condition, etc. — but ONLY ones the buyer's own words actually named, or that you can genuinely see in an attached photo (for a photo, describe everything visually identifiable, not just the bare category, so matching can tell an exact match from a loosely related one). Never invent, guess, or list out plausible-sounding attributes the buyer never mentioned and no photo shows — e.g. for a bare repair request naming no symptom ('fix my phone', 'my laptop isn't working'), do NOT enumerate possible causes or parts ('screen', 'battery', 'software issue') as if the buyer had named them; leave this empty instead. An empty/omitted attributes list is the correct, honest output far more often than a guessed one.",
    ),
  // Optional on purpose: set this ONLY when the buyer's own message names or
  // clearly implies a specific place. Omit it entirely otherwise — the
  // buyer's device location (if known) is used automatically, and if
  // neither exists the search simply runs nationwide rather than asking a
  // clarifying question.
  location: z
    .string()
    .optional()
    .describe(
      "The place name or area the buyer's message itself named, if any (e.g. 'Enugu' or 'Independence Layout, Enugu'). Omit if the buyer didn't mention a place — do not guess or fill in a placeholder like 'unknown'.",
    ),
  radiusKm: z
    .number()
    .optional()
    .describe("Search radius in km. Defaults to 10 if not specified."),
  // The diagram's "extract budget" box made structural (Phase 2 follow-on):
  // a stated ceiling becomes a real, code-enforced price filter in the
  // retrieval backend — never just prose riding along in the query text.
  maxBudgetNaira: z
    .number()
    .optional()
    .describe(
      "The buyer's stated maximum budget, converted to plain Naira — ONLY when their own words state one ('under 200k' → 200000, 'below ₦1.5m' → 1500000, 'between 100k and 150k' → 150000, '50-70k budget' → 70000). Omit entirely when no budget is mentioned — never guess one from the product category, and never treat a target price the buyer hopes to NEGOTIATE DOWN TO as a hard cap unless they phrase it as a limit.",
    ),
});

// Attribute values that describe the ABSENCE of an attribute. The tool
// schema already tells the model at length not to invent attributes, and it
// mostly obeys — but measured live on "I need a good laptop for my
// business", gpt-5-mini returned:
//
//   ["business laptop", "reliable", "durable", "good performance",
//    "suitable for business use", "Windows or macOS, buyer didn't specify"]
//
// That last entry is not an attribute, it is the model narrating its own
// uncertainty — and it goes straight into buildProductTerm, so the text
// that gets embedded and matched against real listings ends with "buyer
// didn't specify". A stronger model produces cleaner attributes (verified:
// gpt-5 returned just ["20000mAh"] where gpt-5-mini returned
// ["20000mAh", "powerbank", "portable charger"]), but it costs 4.5x the
// latency — and this is the same defect for free, caught in code where a
// prompt instruction was never going to be reliable.
const NON_ATTRIBUTE =
  /\b(did ?n[o']?t specify|not specified|unspecified|no preference|any (brand|colour|color|size|type)|n\/a|none specified|buyer did)\b/i;

function usableAttributes(attributes?: string[]): string[] | undefined {
  if (!attributes?.length) return attributes;
  const kept = attributes
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && a.length <= 60 && !NON_ATTRIBUTE.test(a));
  return kept.length ? kept : undefined;
}

export interface SearchProductsCoreInput {
  product: string;
  attributes?: string[];
  location?: string;
  radiusKm?: number;
  maxBudgetNaira?: number;
}

export interface SearchProductsCoreResult {
  results: VendorMatch[];
  matchTier: MatchTier;
  matchQuality: MatchQuality;
  externalSuggestions: NearbyBusiness[];
  locationNote?: string;
  // Present only when the photo/kind-of-item check actually dropped
  // something (see verifyMatches.ts) — a factual note for the model about
  // WHY the result set is thinner (or empty) than the catalog's own hit
  // count, plus an explicit ban on offering what was dropped. Shaped
  // exactly like locationNote: a resolved fact handed over, never something
  // for the model to re-derive.
  filteredNote?: string;
}

/**
 * The actual product search — resolves location, calls the retrieval
 * backend, reports progress via `push`. Split out from searchProductsTool so
 * route.ts can invoke it directly, bypassing the model entirely, as a
 * deterministic cross-check when the model called searchStores alone and
 * came up empty — see route.ts's own comment on that fallback for why a
 * prompt instruction alone (systemPrompt.ts's symmetric-fallback paragraph)
 * wasn't reliable enough on its own: found live, gpt-4o-mini calling
 * searchStores only for "I need a good developer to help build my web and
 * mobile apps", getting zero real Velte stores, and settling for Google
 * Places' generic results without ever trying searchProducts, despite the
 * prompt mandating it — even though a real Velte vendor's own product
 * listing ("Web & Mobile App development") matched the same query directly.
 */
export async function searchProductsCore(
  {
    product,
    attributes,
    location,
    radiusKm,
    maxBudgetNaira,
  }: SearchProductsCoreInput,
  {
    buyerLocation,
    push,
    isImageQuery = false,
    imageUrl,
    weakResultsOut,
    locationLabel,
    allowNearbyBusinesses,
  }: {
    buyerLocation?: BuyerLocation;
    push?: (candidates: string[]) => void;
    isImageQuery?: boolean;
    imageUrl?: string;
    weakResultsOut?: { current: VendorMatch[] };
    // DISPLAY ONLY (Phase 5) — the reverse-geocoded name of the buyer's
    // own coordinates, used to say "near Independence Layout, Enugu"
    // instead of the vague "your area" in the status line. Deliberately
    // NOT the `location` search parameter: this never re-geocodes and
    // never influences what gets searched, so a wrong or stale label can
    // only ever cost a slightly-off status phrase, never a wrong search.
    locationLabel?: string;
    // Google Places (the retrieval backend's Tier 5) — SERVICE requests
    // only, per explicit product decision (2026-08-26). See
    // allowsNearbyBusinesses below for the full reasoning. `undefined`
    // falls back to the text heuristic; route.ts passes the scope check's
    // own read of buyer intent instead, which is a far better signal than
    // keyword-matching the query.
    allowNearbyBusinesses?: boolean;
  } = {},
): Promise<
  SearchProductsCoreResult | { error: "location-not-found"; message: string }
> {
  // Best-effort status text before we know the resolved coordinates —
  // an explicit place is shown as-is; otherwise "your area" if a
  // device location is known, or nothing (nationwide phrasing) if not.
  push?.(
    searchingPhrase(
      product,
      location ?? (buyerLocation ? (locationLabel ?? "your area") : undefined),
    ),
  );

  const resolved = await resolveSearchLocation(buyerLocation, location);
  if (resolved.kind === "not-found") {
    return {
      error: "location-not-found" as const,
      message: `Couldn't find "${resolved.queriedText}" — ask the buyer for a more specific area.`,
    };
  }
  const coords = resolved.kind === "coords" ? resolved.coords : undefined;

  const cleanAttributes = usableAttributes(attributes);
  const queryText = buildProductTerm(product, cleanAttributes);
  const includeNearbyBusinesses = allowsNearbyBusinesses(
    queryText,
    allowNearbyBusinesses,
  );
  let results: VendorMatch[],
    weakResults: VendorMatch[],
    matchTier: MatchTier,
    matchQuality: MatchQuality,
    externalSuggestions: NearbyBusiness[] | null;
  try {
    ({ results, weakResults, matchTier, matchQuality, externalSuggestions } =
      await aiSearchData<{
        results: VendorMatch[];
        weakResults: VendorMatch[];
        matchTier: MatchTier;
        matchQuality: MatchQuality;
        externalSuggestions: NearbyBusiness[] | null;
      }>("/search/products", {
        method: "POST",
        body: {
          queryText,
          lat: coords?.lat,
          lng: coords?.lng,
          radiusKm: radiusKm ?? 10,
          isImageQuery,
          imageUrl,
          maxBudgetNaira,
          // Honored by staffly-ai-backend's retrieval service, which skips
          // the Places call entirely when false — so a product dead end
          // costs nothing at Google, not just "fetched and thrown away".
          includeNearbyBusinesses,
        },
      }));
  } catch (err) {
    // Was uncaught — the AI SDK swallows the thrown error into a generic
    // tool-error the model then apologizes for, with no trace of *why*
    // (timeout vs DNS vs 5xx) in Vercel's logs. Log before rethrowing so
    // the failure is diagnosable instead of a silent LLM-authored apology.
    console.error(
      "[searchProductsTool] aiSearchData(/search/products) failed:",
      err,
    );
    throw err;
  }

  // The kind-of-item gate (verifyMatches.ts). Retrieval matches on MEANING,
  // which puts sneakers right next to a corporate shoe and a phone case
  // right next to a phone — so a candidate clearing the relevance floor is
  // not yet evidence that it's the thing the buyer asked for. This asks
  // that question directly, with the vendor's own photo as the evidence,
  // and drops what fails.
  //
  // Placed HERE, not in route.ts, on purpose: everything downstream of this
  // function reads from what it returns — the status line below, the
  // model's own reply text, the recommendation picks, the dead-end/
  // reach-out fallback, the demand log. Filtering at the source is what
  // makes all of them correct at once; filtering later would still leave
  // the reply describing a listing that's no longer on screen (which is the
  // exact bug this fixes, in a new place).
  //
  // Both buckets go in together: `weakResults` is rendered to the buyer too
  // ("A couple more options — not an exact match"), and a wrong KIND of item
  // is wrong there as well — "not an exact match" is a claim about degree,
  // not a license to show a different product entirely.
  // Gated to "similar" only (2026-08-26, same day it was added). Running it
  // on every search put a fourth blocking LLM round trip — one that also
  // fetches vendor images before it can answer — between retrieval and the
  // reply, and the added latency was immediately noticeable on searches
  // that were never at risk in the first place.
  //
  // "direct" is the backend's own statement that it found a close/exact
  // hit, and it DISCARDS the merely-similar candidates whenever one exists
  // (see MatchQuality). "similar" is the opposite statement: nothing
  // cleared that bar, so here are the closest things that cleared the base
  // relevance floor — which is exactly the state the reported sneaker was
  // returned in, and exactly where a near-neighbour of the wrong kind can
  // survive. Spending the round trip only there keeps the fix pointed at
  // the failure and off the ordinary path.
  //
  // The trade-off, stated plainly: a wrong-kind item that retrieval rated
  // "direct" now gets through unchecked, and so do the weak matches on a
  // "direct" turn (they ride along with whichever quality the main set
  // got). That is a deliberate latency-for-coverage trade, not an
  // oversight — revisit it if a "direct" mismatch is ever actually seen.
  let filteredNote: string | undefined;
  const verifiable =
    matchQuality === "similar" ? [...results, ...weakResults] : [];
  if (verifiable.length) {
    push?.(checkingPhotosPhrase(product));
    const { rejected } = await verifyItemMatches({
      product,
      attributes: cleanAttributes,
      candidates: verifiable,
      isImageQuery,
    });
    if (rejected.length) {
      const droppedIds = new Set(rejected.map((r) => r.match.productId));
      results = results.filter((r) => !droppedIds.has(r.productId));
      weakResults = weakResults.filter((w) => !droppedIds.has(w.productId));
      filteredNote = rejectedMatchesNote(rejected, product) ?? undefined;
      // Worth a log line either way: this is the one place a real vendor's
      // listing gets removed from a buyer's results, so a bad gate has to
      // be diagnosable from the server logs rather than only from a
      // complaint.
      console.info(
        `[search] dropped ${rejected.length} wrong-kind match(es) for "${product}":`,
        rejected.map((r) => `${r.match.name} → ${r.actualItem}`),
      );
      if (!results.length) {
        // Tier and quality describe a result set that no longer exists.
        // Leaving "similar" behind would put the "No exact match, but N
        // similar items" heading over an empty section.
        matchTier = null;
        matchQuality = undefined;
        // And weak matches can't stand alone: they're framed as a
        // supplement to real results ("a couple MORE options"), and the
        // frontend's own turn shape treats them as always-empty-when-
        // products-is. An empty set here is a genuine dead end, which the
        // zero-result path below already handles properly.
        weakResults = [];
      }
    }
  }

  if (results.length) {
    if (isImageQuery && matchQuality === "direct") {
      push?.(directMatchPhrase(results.length));
    } else if (matchQuality === "similar") {
      push?.(similarMatchPhrase(results.length));
    } else {
      push?.(foundCountPhrase(results.length, "product", matchTier));
    }
  } else {
    push?.(noProductMatchPhrase(looksLikeServiceTask(queryText)));
  }

  // Side channel, not this function's return value — see weakResultsOut's
  // own doc comment above for why. Accumulated (deduped by productId), not
  // overwritten — same reasoning as extractOutcome's own products/stores
  // merge in route.ts: the model can call searchProducts more than once in
  // a single turn (e.g. two distinct product needs named in one message),
  // and a plain `=` here would silently drop an earlier call's own weak
  // matches the moment a later call also set this.
  if (weakResultsOut) {
    weakResultsOut.current = Array.from(
      new Map(
        [...weakResultsOut.current, ...weakResults].map((p) => [
          p.productId,
          p,
        ]),
      ).values(),
    );
  }

  // A mechanical fact, not left to the model's own inference: `coords`
  // truthy means a REAL place was actually searched (the buyer's device
  // location or a named place) — Tiers 1-3 (local/nearby/state) already
  // ran and came up empty before this Tier-4 nationwide fallback ever
  // fires, so a result here is genuinely from elsewhere in the country,
  // not "close by". Found live: the model narrated a real-but-distant
  // Tier-4 match (an Anambra caterer for an Enugu buyer) as if it were
  // nearby — relying on the system prompt's general reasoning about
  // matchTier + location context wasn't reliable enough on its own.
  // Handing it this as a direct, already-resolved fact instead of
  // something to re-derive removes that failure mode.
  const locationNote =
    matchTier === "nationwide"
      ? coords
        ? "Nothing matched within the search radius, the wider area, or even the buyer's own state — these results are from elsewhere in the country. You MUST say plainly that nothing was found nearby BEFORE presenting them, naming the actual state each result is in (its own `state` field) rather than implying it's close by."
        : "No location signal existed for this search at all (no place named, no device location) — these results are ranked purely by relevance across all of Velte, not by distance. Say so honestly rather than implying proximity."
      : undefined;

  return {
    results,
    matchTier,
    matchQuality,
    // Belt to the backend flag's braces: an older backend that doesn't
    // know the flag yet still can't put shops-that-sell-things in front of
    // a buyer who asked for a THING.
    externalSuggestions: includeNearbyBusinesses
      ? (externalSuggestions ?? [])
      : [],
    ...(locationNote ? { locationNote } : {}),
    ...(filteredNote ? { filteredNote } : {}),
  };
}

/**
 * For a buyer naming a *specific item* — as opposed to searchStoresTool,
 * which is for a buyer describing a kind of business/vendor rather than a
 * product. Renamed from searchVendorsTool: that name was itself part of the
 * product-vs-vendor confusion this split fixes.
 *
 * `buyerLocation` — real coordinates from the request body (e.g. browser
 * geolocation) — used only when the buyer didn't name a different place in
 * their query; an explicit `location` always wins over it (see
 * resolveSearchLocation). If neither exists, the search runs nationwide.
 * `push` reports progress text at the same two points spec §7 describes.
 * `isImageQuery` — true when the buyer's turn included a photo — the
 * direct-vs-similar match tiering (backend-side) applies either way, this
 * only picks which status phrasing narrates a "direct" result (a text
 * search's own default "N found" phrasing already reads confidently enough
 * on its own; only "similar" needs an explicit callout regardless of kind).
 * `imageUrl` — the buyer's actual photo (not the LLM's text description of
 * it) — passed straight through to the backend so it can be embedded via
 * voyage-multimodal-3 and compared against product image embeddings, not
 * just matched on a text paraphrase.
 * `weakResultsOut` — a side channel, not part of this tool's return value.
 * The backend also returns up to 2 "not that close" candidates alongside
 * the real results (see WEAK_MATCH_LIMIT in retrieval.service.js) — these
 * are a UI-only supplement route.ts renders directly, same reasoning as
 * productStores (route.ts's own comment): the system prompt already forbids
 * the model from restating card-level detail in its closing note (see
 * systemPrompt.ts), so a weak match's whole point — "not a great match,
 * shown anyway" — has no safe way to enter the model's return value without
 * risking it narrating specifics about a deliberately low-confidence
 * result. Stashed here instead of returned, so it's simply never part of
 * what the model sees or can talk about.
 */
export function searchProductsTool(
  buyerLocation?: BuyerLocation,
  push?: (candidates: string[]) => void,
  isImageQuery = false,
  imageUrl?: string,
  weakResultsOut?: { current: VendorMatch[] },
  // Display-only place label for the status line — see searchProductsCore.
  locationLabel?: string,
  // The ceiling already established for THIS request (route.ts's goal
  // sheet, applied only once both its locks pass). Used ONLY when the
  // model's own call omits a budget: a buyer who set ₦700k three turns ago
  // shouldn't have it silently forgotten just because this turn's phrasing
  // didn't repeat it. A budget the model DOES pass always wins — that's
  // either the buyer restating one or deliberately tightening it ("find me
  // something cheaper").
  rememberedBudgetNaira?: number | null,
  // The scope check's own read of buyer intent, resolved to a yes/no by
  // route.ts — see allowsNearbyBusinesses. Omitted means "decide from the
  // query text".
  allowNearbyBusinesses?: boolean,
) {
  return tool({
    description:
      "Search the live catalog for a SPECIFIC PRODUCT OR SERVICE by meaning, proximity, and trust — use this when the buyer names an item they want to buy (e.g. 'white sneakers', 'Tecno fast charger'). For a buyer describing a kind of business/vendor/shop instead of an item, use searchStores. Returns real listings only — never invent a vendor, price, or stock level beyond what this tool returns.",
    inputSchema,
    execute: async ({
      product,
      attributes,
      location,
      radiusKm,
      maxBudgetNaira,
    }) =>
      searchProductsCore(
        {
          product,
          attributes,
          location,
          radiusKm,
          maxBudgetNaira: maxBudgetNaira ?? rememberedBudgetNaira ?? undefined,
        },
        {
          buyerLocation,
          push,
          isImageQuery,
          imageUrl,
          weakResultsOut,
          locationLabel,
          allowNearbyBusinesses,
        },
      ),
  });
}
