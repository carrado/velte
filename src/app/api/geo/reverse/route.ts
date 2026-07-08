import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/server/guards";
import { normalizeNigeriaState } from "@/lib/states";

// GET /api/geo/reverse?lat=&lng=   (public — used pre-account, during signup)
//
// Google Geocoding API is primary — it resolves Nigerian street addresses
// (house number + road) far more often than OpenStreetMap's data, which is
// patchy here. Nominatim is the fallback: free, no key required, and good
// enough (road/neighborhood/city/state, rarely a house number) when Google
// is unset, rate-limited, or returns nothing for a given point.
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface GoogleGeocodeResult {
  address: string;
  state?: string;
}

async function reverseGeocodeGoogle(
  lat: number,
  lng: number,
): Promise<GoogleGeocodeResult | null> {
  if (!GOOGLE_API_KEY) return null;

  try {
    const url = `${GOOGLE_GEOCODE_URL}?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    // ZERO_RESULTS / OVER_QUERY_LIMIT / REQUEST_DENIED (bad key) etc. — all
    // just mean "no usable answer from Google", fall through to Nominatim.
    if (data.status !== "OK" || !data.results?.length) return null;

    // Results are ordered most-to-least specific; the first is the best
    // available match (often a rooftop/street address where OSM has none).
    const components: { long_name: string; types: string[] }[] =
      data.results[0].address_components ?? [];
    const find = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name;

    const streetNumber = find("street_number");
    const route = find("route");
    const street = streetNumber && route ? `${streetNumber} ${route}` : route;
    const neighborhood = find("neighborhood") ?? find("sublocality");
    const city = find("locality") ?? find("administrative_area_level_2");
    const stateRaw = find("administrative_area_level_1");

    const parts = [street, neighborhood, city, stateRaw].filter(Boolean);
    const address =
      parts.length > 0 ? parts.join(", ") : data.results[0].formatted_address;
    if (!address) return null;

    return { address, state: normalizeNigeriaState(stateRaw) };
  } catch {
    return null;
  }
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
// Nominatim requires a descriptive User-Agent identifying the calling app,
// which browsers can't reliably set, and direct client-side calls also risk
// CORS/rate-limit issues since Nominatim wants one consistent identity per
// app, not per-browser — hence proxying server-side.
const USER_AGENT = "Velte/1.0 (https://velte.ng)";

interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

async function reverseGeocodeNominatim(
  lat: number,
  lng: number,
): Promise<GoogleGeocodeResult | null> {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data: NominatimResponse = await res.json();
    const a = data.address ?? {};
    // house_number + road gives a real street address ("12 Adeyemi Street")
    // instead of just the street name — Nominatim only has it where OSM's
    // underlying map data happens to be tagged with one, which is patchy in
    // many Nigerian areas, so this is best-effort, not guaranteed.
    const street =
      a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road;
    const parts = [
      street,
      a.suburb ?? a.neighbourhood,
      a.city ?? a.town ?? a.village,
      a.state,
    ].filter(Boolean);
    const address =
      parts.length > 0 ? parts.join(", ") : (data.display_name ?? "");
    if (!address) return null;

    return { address, state: normalizeNigeriaState(a.state) };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return jsonError(400, "lat/lng must be valid coordinates.");
  }

  const result =
    (await reverseGeocodeGoogle(lat, lng)) ??
    (await reverseGeocodeNominatim(lat, lng));

  if (!result)
    return jsonError(404, "Couldn't determine an address for that location.");

  return NextResponse.json(result);
}
