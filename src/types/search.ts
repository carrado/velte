// Velte AI search endpoint (build-order step c) — POST /api/search.

export interface BuyerLocation {
  lat: number;
  lng: number;
}

// "local" = within the tight radiusKm of the buyer's coordinates (the
// common case). "nearby" = a wider same-city radius, only reached when
// "local" came up empty. "state" = the wider fallback tier still — nothing
// matched locally or nearby, but a real match exists elsewhere in the
// buyer's state. "nationwide" = no location signal at all (device
// permission denied/unavailable AND the buyer named no place) — matched by
// meaning + trust across all of Velte, not filtered or ranked by distance.
// `null` when there are no results at all (nothing to tag).
export type MatchTier = "local" | "nearby" | "state" | "nationwide" | null;

// Only meaningful for image-derived product searches: "direct" means a
// close/exact match to what was in the photo — merely-similar results are
// dropped entirely when a direct match exists. "similar" is today's
// existing behavior (everything that cleared the base relevance floor).
// `undefined` for text-only searches, which don't apply this distinction.
export type MatchQuality = "direct" | "similar" | undefined;

// A prior turn's text only — never the image, and never raw tool-call/
// result payloads. Kept deliberately lightweight: enough for the model to
// follow a conversational refinement ("cheaper", "in red instead"), not a
// full replay of previous results (the assistant's own reply text already
// avoids restating those, per its system prompt). This lives only in the
// browser tab's in-memory state (see SearchHome.tsx) — never localStorage,
// never a database; a refresh loses it entirely, by design.
export interface SearchHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SearchRequestBody {
  // Either message or imageUrl must be present — a bare photo with no
  // caption is a first-class case (build-order step e).
  message: string;
  imageUrl?: string;
  buyerLocation?: BuyerLocation;
  // Prior turns in this browser session, oldest first. Omitted/empty on the
  // first message of a conversation.
  history?: SearchHistoryTurn[];
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
  // null for a "nationwide" match (matchTier) — no buyer coordinate exists
  // to measure a distance against.
  distanceKm: number | null;
  score: number;
}

// Mirrors the shape searchStores() returns in velte-backend's
// retrieval.service.js — a business/vendor match, not a specific listing
// (no price/image-per-product fields).
export interface StoreMatch {
  storeId: string;
  // Lets the frontend recognize when a store result and a product result
  // are the same vendor, for dual-intent queries (see SearchHome.tsx).
  vendorId: string;
  handle: string;
  name: string;
  description: string;
  sectors: string[];
  whatsapp: string | null;
  area: string | null;
  state: string | null;
  // null for a "nationwide" match (matchTier) — no buyer coordinate exists
  // to measure a distance against.
  distanceKm: number | null;
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

// One item from getVendorProductsTool — a SPECIFIC, already-identified
// vendor's own catalog (via the existing public /store/:handle data), not a
// ranked nearby search. No area/state/distanceKm/vendorName: unlike
// VendorMatch, every item here is implicitly the same one store, named in
// the section header instead of repeated per card.
export interface StoreProductItem {
  productId: string;
  name: string;
  price: number;
  priceMax: number | null;
  currency: string;
  mainImageUrl: string | null;
  quoteOnRequest: boolean;
}

// A structured clarifying question from askClarifyingQuestionTool — the
// model's own `reply` text for the turn IS the question itself; this just
// carries the widget metadata needed to render it as buttons or a dedicated
// input instead of plain prose. route.ts guarantees a "choice" clarification
// always has >=2 options (downgrading to "text" server-side otherwise), so
// the frontend never has to re-validate that itself.
export type Clarification =
  | { kind: "text"; question: string }
  | { kind: "choice"; question: string; options: string[] };

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
      // True when a SEARCH tool (searchProducts/searchStores/
      // getVendorProducts) ran this turn — deliberately excludes
      // askClarifyingQuestion, which asks rather than searches, so every
      // array below is trivially empty in that case even though a tool
      // call did happen. Distinguishes a real "nothing found anywhere"
      // dead end (this is true, everything's empty) from the model just
      // asking a question instead of searching (this is false) — the
      // frontend renders those very differently (a dead-end "market
      // suggestion" card vs. the paused clarification widget below).
      toolCalled: boolean;
      // Non-null only when askClarifyingQuestion was called this turn — the
      // frontend renders this as a paused, awaiting-reply widget (buttons
      // or a dedicated input) below the reply, and disables the main
      // composer while it's the latest turn's still-unanswered question.
      clarification: Clarification | null;
      products: VendorMatch[];
      stores: StoreMatch[];
      // The businessType the model actually searched stores for this turn
      // (e.g. "phone repair shop", "tailor") — null when searchStores wasn't
      // called. Lets a pure vendor/store card (no product attached) send a
      // WhatsApp message customized to what the buyer was looking for,
      // instead of a generic "interested in what you offer."
      storesQuery: string | null;
      // The storefront of each matched product's own vendor — deterministic
      // enrichment (a plain lookup by vendorId, not a searchStores tool call)
      // so a photo/text match for a specific item still surfaces the actual
      // store selling it, not just the WhatsApp contact already on the
      // product card. One entry per unique vendor represented in `products`.
      productStores: StoreMatch[];
      productsMatchTier: MatchTier;
      storesMatchTier: MatchTier;
      productsMatchQuality: MatchQuality;
      externalStoreSuggestions: NearbyBusiness[];
      // Populated only when getVendorProductsTool was called this turn —
      // one specific store's own catalog, requested after that store was
      // already found (see route.ts's system prompt).
      vendorProducts: StoreProductItem[];
      vendorProductsStore: {
        name: string;
        handle: string;
        whatsapp: string | null;
        vendorId: string;
      } | null;
    }
  | { type: "error"; message: string };
