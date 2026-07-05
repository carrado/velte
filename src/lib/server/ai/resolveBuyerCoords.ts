import { geocodeArea } from "@/lib/server/geocode";
import type { BuyerLocation } from "@/types/search";

// Shared between searchProductsTool and searchStoresTool — both need the
// same "buyerLocation wins, then geocode, but reject a model's placeholder
// non-answer first" logic.

// A model that ignores the "ask, don't guess" instruction sometimes fills
// `location` with a non-answer instead of an actual place — found live with
// Groq passing "unknown", which Nominatim then silently resolved to *some*
// real place, producing a false "search completed" result. Reject these
// server-side rather than trusting every provider to follow the prompt.
const PLACEHOLDER_LOCATIONS = new Set([
  "unknown",
  "n/a",
  "na",
  "not specified",
  "anywhere",
  "not sure",
  "not given",
]);

export async function resolveBuyerCoords(
  buyerLocation: BuyerLocation | undefined,
  location: string,
): Promise<BuyerLocation | null> {
  if (buyerLocation) return buyerLocation;

  const isPlaceholder = PLACEHOLDER_LOCATIONS.has(
    location.trim().toLowerCase(),
  );
  if (isPlaceholder) return null;

  return geocodeArea(location);
}
