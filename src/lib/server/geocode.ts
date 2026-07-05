import type { BuyerLocation } from "@/types/search";

// Forward-geocode a place name the buyer mentioned in free text (e.g.
// "Enugu" or "Independence Layout, Enugu") into coordinates the retrieval
// core can filter/rank by. Same Nominatim-proxy pattern as
// src/app/api/geo/reverse/route.ts (server-side User-Agent requirement) but
// the opposite direction, biased to Nigeria via `countrycodes`.
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Velte/1.0 (https://velte.ng)";

interface NominatimSearchResult {
  lat: string;
  lon: string;
  /** e.g. "place" (city/town/suburb) vs "boundary" (admin region/state).
   * Named `category` in Nominatim's jsonv2 response — the older `class` field
   * name (used in some Nominatim docs/examples) doesn't exist on this shape. */
  category: string;
}

/** Returns null if the place name couldn't be resolved — the caller should
 * treat that as "ask the buyer for a more specific area," not a hard error. */
export async function geocodeArea(
  location: string,
): Promise<BuyerLocation | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  try {
    // limit=5, not 1: Nominatim ranks a bare place name's *state/LGA
    // boundary* above the actual town by "importance" (confirmed live —
    // "Enugu" alone returns the state's administrative centroid ~20km from
    // the city, which silently pushed every vendor outside a 10km radius).
    // A "place" (city/town/suburb) match is what a buyer actually means;
    // prefer it over a "boundary" (administrative) one when both are present.
    const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&q=${encodeURIComponent(trimmed)}&countrycodes=ng&limit=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const results: NominatimSearchResult[] = await res.json();
    const best = results.find((r) => r.category === "place") ?? results[0];
    if (!best) return null;

    const lat = Number(best.lat);
    const lng = Number(best.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}
