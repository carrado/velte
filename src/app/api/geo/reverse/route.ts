import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/server/guards";
import { normalizeNigeriaState } from "@/lib/states";

// GET /api/geo/reverse?lat=&lng=   (public — used pre-account, during signup)
//
// Proxies OpenStreetMap Nominatim server-side: it requires a descriptive
// User-Agent identifying the calling app, which browsers can't reliably set,
// and direct client-side calls also risk CORS/rate-limit issues since
// Nominatim wants one consistent identity per app, not per-browser.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Velte/1.0 (https://velte.ng)";

interface NominatimAddress {
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

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return jsonError(502, "Couldn't reach the geocoding service.");

    const data: NominatimResponse = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.road,
      a.suburb ?? a.neighbourhood,
      a.city ?? a.town ?? a.village,
      a.state,
    ].filter(Boolean);
    const address =
      parts.length > 0 ? parts.join(", ") : (data.display_name ?? "");

    if (!address)
      return jsonError(404, "Couldn't determine an address for that location.");

    const state = normalizeNigeriaState(a.state);
    return NextResponse.json({ address, state });
  } catch {
    return jsonError(502, "Couldn't reach the geocoding service.");
  }
}
