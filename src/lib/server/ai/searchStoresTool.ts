import { tool } from "ai";
import { z } from "zod";

import { backendData } from "@/lib/server/backend";
import { resolveBuyerCoords } from "@/lib/server/ai/resolveBuyerCoords";
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
  location: z
    .string()
    .describe(
      "The place name or area the buyer mentioned (e.g. 'Enugu' or 'Independence Layout, Enugu').",
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
 */
export function searchStoresTool(
  buyerLocation?: BuyerLocation,
  push?: (text: string) => void,
) {
  return tool({
    description:
      "Search for a TYPE OF BUSINESS/VENDOR/SHOP, not a specific product — use this when the buyer describes what kind of vendor they want (e.g. 'a phone repair shop', 'an electronics store near me', 'a tailor') rather than naming an item to buy. For a specific product, use searchProducts instead. Returns real vendor storefronts only.",
    inputSchema,
    execute: async ({ businessType, location, radiusKm }) => {
      push?.(searchingPhrase(businessType, location));

      const coords = await resolveBuyerCoords(buyerLocation, location);
      if (!coords) {
        return {
          error: "location-not-found" as const,
          message: `Couldn't find "${location}" — ask the buyer for a more specific area.`,
        };
      }

      const { results, matchTier, externalSuggestions } = await backendData<{
        results: StoreMatch[];
        matchTier: MatchTier;
        externalSuggestions: NearbyBusiness[] | null;
      }>("/search/stores", {
        method: "POST",
        body: {
          queryText: businessType,
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: radiusKm ?? 10,
        },
      });

      if (results.length) {
        push?.(
          foundCountPhrase(
            results.length,
            "vendor",
            matchTier === "state" ? "state" : "local",
          ),
        );
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
