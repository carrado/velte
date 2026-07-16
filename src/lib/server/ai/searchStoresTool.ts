import { tool } from "ai";
import { z } from "zod";

import { aiSearchData } from "@/lib/server/aiSearchBackend";
import { resolveSearchLocation } from "@/lib/server/ai/resolveBuyerCoords";
import {
  searchingPhrase,
  foundCountPhrase,
  noVendorMatchPhrase,
} from "@/lib/server/ai/statusPhrases";
import type {
  BuyerLocation,
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
});

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
) {
  return tool({
    description:
      "Search for a TYPE OF BUSINESS/VENDOR/SHOP, not a specific product — use this when the buyer describes what kind of vendor they want (e.g. 'a phone repair shop', 'an electronics store near me', 'a tailor') rather than naming an item to buy. For a specific product, use searchProducts instead. Returns real vendor storefronts only.",
    inputSchema,
    execute: async ({ businessType, location, radiusKm }) => {
      push?.(
        searchingPhrase(
          businessType,
          location ?? (buyerLocation ? "your area" : undefined),
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

      const { results, matchTier, externalSuggestions } = await aiSearchData<{
        results: StoreMatch[];
        matchTier: MatchTier;
        externalSuggestions: NearbyBusiness[] | null;
      }>("/search/stores", {
        method: "POST",
        body: {
          queryText: businessType,
          lat: coords?.lat,
          lng: coords?.lng,
          radiusKm: radiusKm ?? 10,
        },
      });

      if (results.length) {
        push?.(foundCountPhrase(results.length, "vendor", matchTier));
      } else {
        push?.(noVendorMatchPhrase(Boolean(externalSuggestions?.length)));
      }

      return {
        results,
        matchTier,
        externalSuggestions: externalSuggestions ?? [],
      };
    },
  });
}
