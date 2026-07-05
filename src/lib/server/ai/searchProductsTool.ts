import { tool } from "ai";
import { z } from "zod";

import { backendData } from "@/lib/server/backend";
import { resolveBuyerCoords } from "@/lib/server/ai/resolveBuyerCoords";
import {
  searchingPhrase,
  foundCountPhrase,
  directMatchPhrase,
  similarMatchPhrase,
  noProductMatchPhrase,
} from "@/lib/server/ai/statusPhrases";
import type {
  BuyerLocation,
  MatchTier,
  MatchQuality,
  VendorMatch,
} from "@/types/search";

const inputSchema = z.object({
  product: z
    .string()
    .describe("The specific product or service the buyer is looking for."),
  attributes: z
    .array(z.string())
    .optional()
    .describe(
      "Specific attributes — color, size, brand, material, style, condition, etc. Include these whether the buyer typed them OR you can see them in an attached photo — for a photo, describe everything visually identifiable, not just the bare category, so matching can tell an exact match from a loosely related one.",
    ),
  // Required on purpose: if the buyer's message has no location and none was
  // supplied via buyerLocation, the model can't fill this and — per the
  // system prompt — asks one clarifying question instead of guessing a city.
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
 * For a buyer naming a *specific item* — as opposed to searchStoresTool,
 * which is for a buyer describing a kind of business/vendor rather than a
 * product. Renamed from searchVendorsTool: that name was itself part of the
 * product-vs-vendor confusion this split fixes.
 *
 * `buyerLocation` — real coordinates from the request body (e.g. browser
 * geolocation) — takes priority over geocoding the model-extracted location
 * text; the tool result is the only vendor/price data the model ever sees.
 * `push` reports progress text at the same two points spec §7 describes.
 * `isImageQuery` — true when the buyer's turn included a photo — turns on
 * the direct-vs-similar match tiering (backend-side) and its narration.
 */
export function searchProductsTool(
  buyerLocation?: BuyerLocation,
  push?: (text: string) => void,
  isImageQuery = false,
) {
  return tool({
    description:
      "Search the live catalog for a SPECIFIC PRODUCT OR SERVICE by meaning, proximity, and trust — use this when the buyer names an item they want to buy (e.g. 'white sneakers', 'Tecno fast charger'). For a buyer describing a kind of business/vendor/shop instead of an item, use searchStores. Returns real listings only — never invent a vendor, price, or stock level beyond what this tool returns.",
    inputSchema,
    execute: async ({ product, attributes, location, radiusKm }) => {
      push?.(searchingPhrase(product, location));

      const coords = await resolveBuyerCoords(buyerLocation, location);
      if (!coords) {
        return {
          error: "location-not-found" as const,
          message: `Couldn't find "${location}" — ask the buyer for a more specific area.`,
        };
      }

      const queryText = [product, ...(attributes ?? [])].join(" ");
      const { results, matchTier, matchQuality } = await backendData<{
        results: VendorMatch[];
        matchTier: MatchTier;
        matchQuality: MatchQuality;
      }>("/search/products", {
        method: "POST",
        body: {
          queryText,
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: radiusKm ?? 10,
          isImageQuery,
        },
      });

      if (results.length) {
        if (isImageQuery && matchQuality === "direct") {
          push?.(directMatchPhrase(results.length));
        } else if (isImageQuery && matchQuality === "similar") {
          push?.(similarMatchPhrase(results.length));
        } else {
          push?.(
            foundCountPhrase(
              results.length,
              "product",
              matchTier === "state" ? "state" : "local",
            ),
          );
        }
      } else {
        push?.(noProductMatchPhrase());
      }

      return { results, matchTier, matchQuality };
    },
  });
}
