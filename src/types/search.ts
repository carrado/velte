// Velte AI search endpoint (build-order step c) — POST /api/search.

export interface BuyerLocation {
  lat: number;
  lng: number;
}

// "local" = within the tight radiusKm of the buyer's coordinates (the
// common case). "state" = the wider fallback tier — nothing matched
// locally, but a real match exists elsewhere in the buyer's state. `null`
// when there are no results at all (nothing to tag).
export type MatchTier = "local" | "state" | null;

// Only meaningful for image-derived product searches: "direct" means a
// close/exact match to what was in the photo — merely-similar results are
// dropped entirely when a direct match exists. "similar" is today's
// existing behavior (everything that cleared the base relevance floor).
// `undefined` for text-only searches, which don't apply this distinction.
export type MatchQuality = "direct" | "similar" | undefined;

export interface SearchRequestBody {
  // Either message or imageUrl must be present — a bare photo with no
  // caption is a first-class case (build-order step e).
  message: string;
  imageUrl?: string;
  buyerLocation?: BuyerLocation;
}

// Mirrors the shape searchProducts() returns in velte-backend's
// retrieval.service.js.
export interface VendorMatch {
  productId: string;
  name: string;
  price: number;
  priceMax: number | null;
  currency: string;
  mainImageUrl: string | null;
  vendorId: string;
  vendorName: string;
  area: string | null;
  state: string | null;
  whatsapp: string | null;
  distanceKm: number;
  score: number;
}

// Mirrors the shape searchStores() returns in velte-backend's
// retrieval.service.js — a business/vendor match, not a specific listing
// (no price/image-per-product fields).
export interface StoreMatch {
  storeId: string;
  handle: string;
  name: string;
  description: string;
  sectors: string[];
  whatsapp: string | null;
  area: string | null;
  state: string | null;
  distanceKm: number;
  score: number;
}

// A real nearby business from Google Places — Tier 3 of searchStores, only
// populated when no Velte vendor matched at all. Deliberately thin (no
// handle, no whatsapp, no trust) since it's not a Velte entity: no
// relationship to hand a "chat with vendor" CTA off to.
export interface NearbyBusiness {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

// Build-order step d — /api/search streams a sequence of these as
// newline-delimited JSON: zero or more "status" events while the model +
// tool call are in flight, then exactly one "final" (or "error"). `products`
// and `stores` are independent — a turn may populate either, both, or
// neither, depending on whether the buyer named an item or a kind of
// business (or the model asked a clarifying question instead of searching).
export type SearchStreamEvent =
  | { type: "status"; text: string }
  | {
      type: "final";
      reply: string;
      products: VendorMatch[];
      stores: StoreMatch[];
      productsMatchTier: MatchTier;
      storesMatchTier: MatchTier;
      productsMatchQuality: MatchQuality;
      externalStoreSuggestions: NearbyBusiness[];
    }
  | { type: "error"; message: string };
