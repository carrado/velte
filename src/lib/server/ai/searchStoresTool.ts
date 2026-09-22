import { tool } from "ai";
import { z } from "zod";

import { aiSearchData } from "@/lib/server/aiSearchBackend";
import { cleanBusinessType, isVagueReference } from "@/lib/productTerm";
import { resolveSearchLocation } from "@/lib/server/ai/resolveBuyerCoords";
import { allowsNearbyBusinesses } from "@/lib/server/ai/sectorClarifiers";
import {
  usableAttributes,
  usableBudget,
} from "@/lib/server/ai/searchProductsTool";
import {
  searchingPhrase,
  foundCountPhrase,
  noVendorMatchPhrase,
} from "@/lib/server/ai/statusPhrases";
import type {
  BuyerLocation,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  StoreMatch,
} from "@/types/search";

const inputSchema = z.object({
  businessType: z
    .string()
    .describe(
      "The kind of business/vendor/shop the buyer is looking for (e.g. 'phone repair shop', 'electronics store', 'tailor').",
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
  // Both fields below (2026-09-17) are NEVER used to filter or narrow which
  // vendors this call returns — searchStores matches on businessType alone,
  // same as before. They exist purely so a real detail the buyer already
  // gave (over this message or an earlier turn of the SAME request) reaches
  // the vendor's own WhatsApp handoff message instead of being dropped —
  // see StoreResultCard's own comment on why a vendor deciding whether to
  // reply wants this even though the search itself never needed it.
  attributes: z
    .array(z.string())
    .optional()
    .describe(
      "Specific details about the SERVICE/JOB the buyer wants this vendor for — timeframe, event date, quantity, a distinguishing spec, or anything else genuinely relevant to a vendor deciding whether and how to respond — but ONLY ones the buyer's own words actually gave, this message or an earlier turn of this same request. Same rule as searchProducts' own attributes: never invent or guess a plausible-sounding one, an empty/omitted list is correct far more often than a guessed one, and each entry is one short standalone trait, never a clause stitched together with 'and'/'with'/'for'.",
    ),
  maxBudgetNaira: z
    .number()
    .optional()
    .describe(
      "The buyer's stated budget for this job, in plain Naira, ONLY when their own words state one — same conversion rule as searchProducts' own maxBudgetNaira. Omit entirely when no budget is mentioned.",
    ),
});

export interface SearchStoresCoreInput {
  businessType: string;
  location?: string;
  radiusKm?: number;
  attributes?: string[];
  maxBudgetNaira?: number;
}

export interface SearchStoresCoreResult {
  results: StoreMatch[];
  // A small bonus bucket of other real vendors slightly further out than
  // `results` (never the same ones — see retrieval.service.js's
  // attachFurther) — 1 when `results` has 1-2 entries, 2 when it has more,
  // never more than 2. Wallet-eligible and exposure-throttled same as any
  // other match; empty when `results` itself is empty, or when `results`
  // already came from the widest (nationwide) tier with nothing wider to
  // draw a bonus from.
  furtherResults: StoreMatch[];
  matchTier: MatchTier;
  // "similar" only reachable via the retrieval backend's weak-match fallback
  // (see retrieval.service.js's weakByTier) — a near-miss vendor shown as a
  // last resort before Google Places, since store bios often don't spell out
  // every sector they're tagged with. "direct" for an ordinary strong match,
  // same distinction searchProducts already makes. `undefined` only when
  // there are no results at all.
  matchQuality: MatchQuality;
  externalSuggestions: NearbyBusiness[];
  locationNote?: string;
}

/**
 * The actual store search — resolves location, calls the retrieval backend,
 * reports progress via `push`. Split out from searchStoresTool, mirroring
 * searchProductsCore, so route.ts can invoke it directly as a deterministic
 * cross-check when the model called searchProducts alone and came up empty
 * — see route.ts's own comment on that fallback.
 */
export async function searchStoresCore(
  {
    businessType: rawBusinessType,
    location,
    radiusKm,
    attributes,
    maxBudgetNaira,
  }: SearchStoresCoreInput,
  {
    buyerLocation,
    push,
    locationLabel,
    allowNearbyBusinesses,
  }: {
    buyerLocation?: BuyerLocation;
    push?: (candidates: string[]) => void;
    // DISPLAY ONLY (Phase 5) — the reverse-geocoded name of the buyer's
    // own coordinates, so the status line can say "near Independence
    // Layout, Enugu" instead of "your area". Never the `location` search
    // parameter: it doesn't re-geocode and can't change what's searched.
    locationLabel?: string;
    // Google Places (Tier 5) — service requests only. See
    // allowsNearbyBusinesses. A store search reads as a service one when
    // its own businessType does ("phone repair shop" yes, "electronics
    // store" no); route.ts overrides that with the scope check's intent.
    allowNearbyBusinesses?: boolean;
  } = {},
): Promise<
  SearchStoresCoreResult | { error: "location-not-found"; message: string }
> {
  // Cleaned ONCE, here, so every use below (the actual search query, the
  // status line, matchedQuery tagging, the WhatsApp handoff text) sees the
  // same clean value — see cleanBusinessType's own comment for the live
  // bug this fixes ("DJ services one day" reaching the backend AND the
  // buyer-facing dead-end text verbatim).
  const businessType = cleanBusinessType(rawBusinessType);
  push?.(
    searchingPhrase(
      businessType,
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

  // See productTerm.ts's isVagueReference — "all of them", "the best" name
  // no real kind of business to search for. Same treatment searchProducts-
  // Core gives it: a clean, honest zero-result search rather than a real
  // lookup (and the external Places/Serper fallback it could otherwise
  // trigger) on a term with nothing in it to match against.
  if (isVagueReference(businessType)) {
    return {
      results: [],
      furtherResults: [],
      matchTier: null,
      matchQuality: undefined,
      externalSuggestions: [],
    };
  }

  const includeNearbyBusinesses = allowsNearbyBusinesses(
    businessType,
    allowNearbyBusinesses,
  );
  let results: StoreMatch[],
    furtherResults: StoreMatch[],
    matchTier: MatchTier,
    matchQuality: MatchQuality,
    externalSuggestions: NearbyBusiness[] | null;
  try {
    ({ results, furtherResults, matchTier, matchQuality, externalSuggestions } =
      await aiSearchData<{
        results: StoreMatch[];
        furtherResults: StoreMatch[];
        matchTier: MatchTier;
        matchQuality: MatchQuality;
        externalSuggestions: NearbyBusiness[] | null;
      }>("/search/stores", {
        method: "POST",
        body: {
          queryText: businessType,
          lat: coords?.lat,
          lng: coords?.lng,
          radiusKm: radiusKm ?? 10,
          // See searchProductsCore's own comment — the backend skips the
          // Places call outright when this is false.
          includeNearbyBusinesses,
        },
      }));
  } catch (err) {
    // Same reasoning as searchProductsTool's own catch — see that comment.
    console.error(
      "[searchStoresTool] aiSearchData(/search/stores) failed:",
      err,
    );
    throw err;
  }

  // Dropped here as well as at the backend flag, so an older backend that
  // doesn't know the flag yet still can't leak Places into a product turn.
  if (!includeNearbyBusinesses) externalSuggestions = null;

  if (results.length) {
    push?.(foundCountPhrase(results.length, "vendor", matchTier));
  } else {
    push?.(noVendorMatchPhrase(Boolean(externalSuggestions?.length)));
  }

  // Tag every store with the exact businessType THIS call searched for —
  // the backend response has no notion of it. Lets a turn that calls
  // searchStores more than once for genuinely different needs (see
  // route.ts's own .findLast comment) give each store card a WhatsApp
  // message scoped to what actually matched it, rather than every result
  // across every call sharing one turn-level query (see StoreMatch's own
  // matchedQuery comment).
  //
  // Same tagging, same reasoning, for attributes/budget (2026-09-17) — see
  // StoreResultCard's own comment on what these become in the WhatsApp
  // message. Cleaned through the exact same guards searchProductsCore
  // applies to its own attributes/budget (self-questioning/placeholder
  // filtering, a non-finite or non-positive budget dropped) rather than a
  // second copy of that logic.
  const cleanAttributes = usableAttributes(attributes) ?? [];
  const cleanBudget = usableBudget(maxBudgetNaira) ?? null;
  results = results.map((s) => ({
    ...s,
    matchedQuery: businessType,
    matchedAttributes: cleanAttributes,
    matchedBudgetNaira: cleanBudget,
  }));
  furtherResults = furtherResults.map((s) => ({
    ...s,
    matchedQuery: businessType,
    matchedAttributes: cleanAttributes,
    matchedBudgetNaira: cleanBudget,
  }));

  // Same mechanical-fact reasoning as searchProductsCore's own
  // locationNote — see that file's comment. `coords` truthy means a real
  // place was actually searched (Tiers 1-3 already ran and came up
  // empty), so a Tier-4 nationwide store match here is genuinely from
  // elsewhere in the country, not nearby.
  const locationNote =
    matchTier === "nationwide"
      ? coords
        ? "Nothing matched within the search radius, the wider area, or even the buyer's own state — these results are from elsewhere in the country. You MUST say plainly that nothing was found nearby BEFORE presenting them, naming the actual state each result is in (its own `state` field) rather than implying it's close by."
        : "No location signal existed for this search at all (no place named, no device location) — these results are ranked purely by relevance across all of Velte, not by distance. Say so honestly rather than implying proximity."
      : undefined;

  return {
    results,
    furtherResults,
    matchTier,
    matchQuality,
    externalSuggestions: externalSuggestions ?? [],
    ...(locationNote ? { locationNote } : {}),
  };
}

/**
 * For a buyer describing a *kind of business/vendor* rather than a specific
 * product — the sibling of searchProductsTool. Matches against store-level
 * profiles (name/description/sectors), so a vendor with no uploaded
 * offerings is still discoverable, per the marketplace model's own point.
 *
 * `buyerLocation` — real coordinates from the request body (e.g. browser
 * geolocation) — used only when the buyer didn't name a different place in
 * their query; an explicit `location` always wins over it (see
 * resolveSearchLocation). If neither exists, the search runs nationwide and
 * Google Places (Tier 4) is skipped entirely — a "nearby business" fallback
 * is meaningless without somewhere to be near.
 */
export function searchStoresTool(
  buyerLocation?: BuyerLocation,
  push?: (candidates: string[]) => void,
  // Display-only place label for the status line — see searchStoresCore.
  locationLabel?: string,
  // See allowsNearbyBusinesses — route.ts resolves this from the scope
  // check's seekingKind; omitted means "decide from the query text".
  allowNearbyBusinesses?: boolean,
) {
  return tool({
    description:
      "Search for a TYPE OF BUSINESS/VENDOR/SHOP, not a specific product — use this when the buyer describes what kind of vendor they want (e.g. 'a phone repair shop', 'an electronics store near me', 'a tailor') rather than naming an item to buy. For a specific product, use searchProducts instead. Returns real vendor storefronts only.",
    inputSchema,
    execute: async ({
      businessType,
      location,
      radiusKm,
      attributes,
      maxBudgetNaira,
    }) =>
      searchStoresCore(
        { businessType, location, radiusKm, attributes, maxBudgetNaira },
        { buyerLocation, push, locationLabel, allowNearbyBusinesses },
      ),
  });
}
