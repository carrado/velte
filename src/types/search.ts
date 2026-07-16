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

// Set for image-derived product searches only: "direct" means a close/exact
// match to what was in the photo, and merely-similar results are dropped
// entirely when a direct match exists. "similar" means nothing cleared that
// bar, so the closest results that cleared the base relevance floor are
// shown instead. `undefined` for plain text searches, which don't apply this
// distinction.
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
  kind: "product" | "service";
  name: string;
  price: number;
  priceMax: number | null;
  // Quote-per-job service — price is a placeholder 0, not a real price;
  // render "Ask for price", never ₦0 (same rule as StoreProductItem).
  quoteOnRequest: boolean;
  currency: string;
  mainImageUrl: string | null;
  description: string | null;
  // Vendor-uploaded detail fields (e.g. "Coverage Area": "Lagos mainland") —
  // shown in full on a service result's own card so the buyer sees exactly
  // what the vendor posted, instead of a separate "Sold by" store card.
  attributes: { name: string; value: string }[];
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
      // Up to 2 "not that close" candidates from the SAME tier as `products`
      // (see WEAK_MATCH_LIMIT in retrieval.service.js) — a supplement to
      // real results, never a substitute: always empty when `products` is
      // empty too. Deliberately never seen by the model (see
      // searchProductsTool.ts's weakResultsOut) — the frontend must label
      // these honestly as not-quite-matches, never render them
      // indistinguishably from `products`.
      weakProducts: VendorMatch[];
      stores: StoreMatch[];
      // The businessType the model actually searched stores for this turn
      // (e.g. "phone repair shop", "tailor") — null when searchStores wasn't
      // called. Lets a pure vendor/store card (no product attached) send a
      // WhatsApp message customized to what the buyer was looking for,
      // instead of a generic "interested in what you offer."
      storesQuery: string | null;
      // The storefront of each matched PRODUCT's own vendor — deterministic
      // enrichment (a plain lookup by vendorId, not a searchStores tool call)
      // so a photo/text match for a specific item still surfaces the actual
      // store selling it, not just the WhatsApp contact already on the
      // product card. One entry per unique vendor represented among the
      // product-kind entries of `products` — service-kind results are
      // deliberately excluded (see VendorResultCard: a service's own card
      // already shows everything the vendor uploaded plus its own WhatsApp
      // CTA, so a companion store card would just duplicate that contact).
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
