import { geocodeArea } from "@/lib/server/geocode";
import type { BuyerLocation } from "@/types/search";

// Shared between searchProductsTool and searchStoresTool — resolves which
// coordinates (if any) a search should use, per the buyer's own stated
// priority: an explicit place named in the query always wins, even over a
// known device location (they're deliberately asking about somewhere
// else — buying for someone in another city, planning a trip, etc.);
// device location is the fallback when they named no place; and when
// neither exists, there's no location signal at all — the caller should
// run a nationwide, non-geo-filtered search rather than ask a clarifying
// question.

// A model that ignores the "omit `location` if the buyer named no place"
// instruction sometimes fills it with a non-answer instead of actually
// omitting the field — found live with Groq passing "unknown", which
// Nominatim then silently resolved to *some* real place, producing a false
// "search completed" result. Treated the same as an omitted field (fall
// through to device location, or "none"), not as an explicit place.
const PLACEHOLDER_LOCATIONS = new Set([
  "unknown",
  "n/a",
  "na",
  "not specified",
  "anywhere",
  "not sure",
  "not given",
]);

export type ResolvedSearchLocation =
  // An explicit place was named in the query and successfully geocoded, OR
  // no place was named and the buyer's device location is known.
  | { kind: "coords"; coords: BuyerLocation }
  // No location signal at all — search nationwide, no distance filter/rank.
  | { kind: "none" }
  // A place WAS named but couldn't be resolved — this is the one case that
  // should still surface as an error: the buyer gave a specific, unusable
  // answer rather than no answer at all.
  | { kind: "not-found"; queriedText: string };

export async function resolveSearchLocation(
  buyerLocation: BuyerLocation | undefined,
  location: string | undefined,
): Promise<ResolvedSearchLocation> {
  const trimmed = location?.trim();
  const isExplicitPlace =
    Boolean(trimmed) && !PLACEHOLDER_LOCATIONS.has(trimmed!.toLowerCase());

  if (isExplicitPlace) {
    const coords = await geocodeArea(trimmed!);
    return coords
      ? { kind: "coords", coords }
      : { kind: "not-found", queriedText: trimmed! };
  }

  if (buyerLocation) return { kind: "coords", coords: buyerLocation };

  return { kind: "none" };
}
