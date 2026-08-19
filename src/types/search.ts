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

// Set for any product search, text or photo: "direct" means a close/exact
// match to the query, and merely-similar results are dropped entirely when a
// direct match exists. "similar" means nothing cleared that bar, so the
// closest results that cleared the base relevance floor are shown instead.
// `undefined` only when there are no results at all (nothing to tag).
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
  // True for an assistant turn that's either a reach-out offer itself
  // (mirrors that turn's own buyerRequestOffered) OR the follow-up
  // name-ask that can come right after one (route.ts's own deterministic
  // short-circuit — see buildAgreementOnlySystemPrompt) — both are
  // moments where the buyer's VERY NEXT message should be routed through
  // that same short-circuit (route.ts's own isAnsweringOffer check),
  // never treated as a fresh request. Set directly by SearchHome.tsx from
  // structured client state (mirrors SearchStreamEvent's own matching
  // field on the final event), never guessed from the text itself — found
  // live: without this, a plain "yes" fell through as a fresh search
  // instead of proceeding toward createBuyerRequest, and even once that
  // was fixed for "yes" alone, the FOLLOW-UP name reply (plain free text,
  // never matching any canned agreement phrase) still fell through the
  // same way — this field is what makes BOTH steps of that one exchange
  // reliable, not just the first. Omitted (or false/undefined) for every
  // other turn, including a user-role one.
  awaitingBuyerRequestReply?: boolean;
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
  // Status-line strings already shown to the buyer in EARLIER turns this
  // session (see SearchHome.tsx's shownStatusesRef) — each /api/search call
  // is otherwise stateless, so without this the server's own within-turn
  // repeat-avoidance (see statusPhrases.ts's pickAvoiding) resets to blank
  // on every new search, and the exact same status line can resurface
  // search after search. Most-recent-last, capped client-side; the server
  // caps it again on its own end regardless.
  recentStatuses?: string[];
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
  // Everything beyond the main image — lets a result card offer a swipeable
  // gallery instead of pinning the buyer to whichever single photo the
  // vendor set as "main".
  thumbnailUrls: string[];
  // Null when the vendor has no Store record at all (shouldn't normally
  // happen — every vendor gets one at signup — but a matched product should
  // never be unrenderable over a missing storefront link).
  storeHandle: string | null;
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

// Mirrors the shape searchStores() returns in staffly-ai-backend's
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
  // The vendor's own profile picture (User.avatar) and the store's uploaded
  // gallery photos — same two fields the marketplace's VendorCard already
  // reads (VendorPreviewItem), null/empty when the vendor hasn't set one.
  // Powers StoreResultCard's avatar and VendorDetailModal's sliding cover.
  avatar: string | null;
  gallery: string[];
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

// A structured outcome from createBuyerRequestTool — the AI-agent fallback
// (2026-08-15) that replaces a standalone "Post a Request" page: the model
// calls this itself, mid-conversation, once a real search has come up empty
// and the buyer has agreed to have Velte reach out to businesses on their
// behalf. `description` is always present — the model's own self-contained
// summary of what the buyer needs, same text a human would have typed into
// the old manual form.
export type BuyerRequestOffer =
  // No buyer session exists yet — nothing was created. SearchHome.tsx's own
  // composer (2026-08-19 redesign — see its own IdentityCapture, below)
  // swaps into a phone/OTP identity-capture mode and, once verified,
  // creates the request itself via a plain POST /buyer-requests — no
  // second AI turn needed for that part. `buyerName` is already known by
  // this point (the model only calls createBuyerRequest once it's asked for
  // and gotten a name — see systemPrompt.ts) and is carried through so that
  // later POST can send it along with the now-verified phone.
  | { status: "needs_identity"; description: string; buyerName: string }
  // A buyer session already existed — the tool created the request
  // immediately, server-side, same turn.
  | { status: "created"; requestId: string; description: string }
  // A buyer session existed (or was just verified), but matching found zero
  // vendors for this need — the backend deliberately skips persisting a
  // request nobody would ever see (see createRequest's own comment).
  // systemPrompt.ts re-searches in the SAME turn on seeing this, so the
  // buyer gets Google Places suggestions instead of a hollow "I've reached
  // out" confirmation.
  | { status: "no_match"; description: string }
  | { status: "error"; description: string };

// Drives SearchHome.tsx's own composer-based phone/OTP identity-capture
// flow (2026-08-19 redesign, replacing BuyerRequestOfferWidget's old
// inline BuyerPhoneVerifyForm card) — per explicit request, no separate
// form widget floating alongside the normal composer: the composer ITSELF
// swaps from the free-text textarea to a single-line phone/OTP input
// while this is set, and the buyer's own submitted value (phone, then the
// code) appends as an ordinary chat turn, same as any other message, with
// the usual shimmering status line narrating each step (sending the code,
// checking it, creating the request) — never a silent background POST.
// `offer` is the triggering `needs_identity` outcome (carries
// `description`/`buyerName` through unchanged to the eventual POST
// /buyer-requests); `imageUrl` is read once off the ORIGIN turn's own
// image, if any.
export interface IdentityCapture {
  offer: Extract<BuyerRequestOffer, { status: "needs_identity" }>;
  imageUrl: string | null;
  step: "phone" | "otp";
  phone: string;
}

// A structured clarifying question from askClarifyingQuestionTool — the
// model's own `reply` text for the turn IS the question itself; this just
// carries the widget metadata needed to render it as buttons or a dedicated
// input instead of plain prose. route.ts guarantees a "choice" clarification
// always has >=2 options (downgrading to "text" server-side otherwise), so
// the frontend never has to re-validate that itself.
export type Clarification =
  | { kind: "text"; question: string }
  | { kind: "choice"; question: string; options: string[] }
  // No options — the frontend renders a one-tap "share my location" action
  // (real browser geolocation) plus a plain decline, not buttons built from
  // model-supplied text. See systemPrompt.ts's location rule for when this
  // fires: neither a named place nor a known device location exists for a
  // search that needs one.
  | { kind: "location"; question: string };

// Build-order step d — /api/search streams a sequence of these as
// newline-delimited JSON: zero or more "status" events while the model +
// tool call are in flight, then exactly one "final" (or "error"). `products`
// and `stores` are independent — a turn may populate either, both, or
// neither, depending on whether the buyer named an item or a kind of
// business (or the model asked a clarifying question instead of searching).
export type SearchStreamEvent =
  | { type: "status"; text: string }
  // A complete, standalone chat bubble arriving mid-turn, BEFORE the final
  // event — used only by route.ts's unified dead-end handler, to close the
  // loop on the search that just ran ("Couldn't find that directly on
  // Velte.") while status events keep narrating a second, wider vendor
  // scan underneath it. Unlike `status` (an ephemeral, overwritten ticker
  // line), each `reply` is kept and rendered as its own permanent bubble —
  // see SearchHome.tsx's `interimReplies`.
  | { type: "reply"; text: string }
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
      // A small bonus bucket of real vendors slightly further out than
      // `stores` (never the same ones — deduped server-side, see
      // retrieval.service.js's attachFurther) — 1 entry when `stores` has
      // 1-2, 2 when it has more, never more than 2. Wallet-eligible and
      // exposure-throttled same as any other match. Always empty when
      // `stores` is empty, or when `stores` itself already came from the
      // widest (nationwide) tier with nothing wider to draw a bonus from.
      // Render as its own clearly-labeled "also available further out"
      // section below `stores`, never blended in indistinguishably.
      furtherStores: StoreMatch[];
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
      // The reverse direction of productStores: for a searchStores turn
      // (buyer describing a kind of vendor, not a specific item), each
      // matched store's OWN service listings that match what the buyer
      // actually asked for — deterministic enrichment (a plain lookup of
      // that store's public catalog, not a model tool call), keyed by
      // `vendorId` so the frontend renders each as a companion card under
      // its own store's card (see getMatchingServicesForStores in route.ts).
      // Up to a few per vendor, cheap keyword-overlap matched against the
      // store's own name/description text — not a full semantic search, so
      // treat this as "worth a look," not a guaranteed exact match.
      storeServices: VendorMatch[];
      productsMatchTier: MatchTier;
      storesMatchTier: MatchTier;
      productsMatchQuality: MatchQuality;
      // "similar" only reachable via the retrieval backend's weak-match
      // fallback (see retrieval.service.js's weakByTier) — a near-miss
      // vendor shown as a last resort before Google Places, since store
      // bios often don't spell out every sector they're tagged with.
      storesMatchQuality: MatchQuality;
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
      // Non-null only when createBuyerRequest was called this turn — see
      // BuyerRequestOffer's own comment. Independent of `clarification`
      // (askClarifyingQuestion) and of toolCalled (a search tool result) —
      // in practice this only ever appears when both are otherwise empty,
      // since the model is only supposed to reach for this after a real
      // search already came up with nothing, but the type doesn't enforce
      // that itself.
      buyerRequestOffer: BuyerRequestOffer | null;
      // True only when offerBuyerRequestTool ran this turn — see its own
      // comment. A "genuine dead end" (both search tools empty) doesn't
      // always mean nothing at all exists: searchProducts/searchStores'
      // own Tier 5 (Google Places) can still have populated
      // `externalStoreSuggestions` in the SAME turn. This flag is what
      // tells the frontend to hold those back and show the reach-out offer
      // instead — Buyer Requests come first; Places only surfaces if the
      // buyer declines the offer on a later turn (a fresh search, this
      // flag false that time — see systemPrompt.ts's own rule).
      buyerRequestOffered: boolean;
      // Non-null only on a genuine DUAL-intent turn (the buyer named a
      // specific item AND a separate kind of business, e.g. "fix my laptop
      // screen, and also a plumber") — see route.ts's own comment on where
      // this branches off the normal single-item flow entirely. Item A
      // (the product-side term, by convention) is resolved to completion
      // and shown normally, this same turn, via the fields above — nothing
      // is held back. This field is what SearchHome.tsx should fetch next,
      // via POST /api/search/resolve-item, for item B (the store-side
      // term) — but WHEN that fetch actually starts is entirely
      // SearchHome.tsx's own call, not this turn's: only once item A's own
      // flow concludes (including its own reach-out-offer exchange, if it
      // has one), per explicit design — see SearchHome.tsx's own comment
      // on the background-item top bar. No LLM involved in resolving it —
      // the term was already extracted on this same turn, only the search
      // itself is still pending.
      backgroundItem: BackgroundSearchItem | null;
      // True whenever the buyer's VERY NEXT message should be routed
      // through route.ts's deterministic agreement short-circuit instead
      // of treated as a fresh request — mirrors `buyerRequestOffered`
      // whenever that's true (a reach-out offer was just made, on either
      // the ordinary single-item path or either side of a dual-intent
      // pair), and is ALSO true on its own for one more turn when this
      // turn is the short-circuit's own follow-up name-ask (buyerRequestOffered
      // is false there — no offer was made THIS turn — but the buyer's
      // reply is still that same exchange, just its second half). See
      // SearchHistoryTurn's own matching field, which SearchHome.tsx
      // copies this into for the next call's `history`.
      awaitingBuyerRequestReply: boolean;
    }
  | { type: "error"; message: string };

// One named intent from a buyer's turn — either a specific PRODUCT/service
// or a kind of BUSINESS/vendor, the same distinction searchProducts/
// searchStores already make, packaged as one value so a single item can be
// resolved on its own (see resolveSearchItem.ts, server-only — this type
// itself lives here, not there, specifically so it stays safe to import
// into a client component like SearchHome.tsx without dragging that
// file's server-only search calls into the client bundle).
export type SearchItemInput =
  | { type: "product"; product: string; attributes?: string[] }
  | { type: "store"; businessType: string };

// The full outcome of resolving one item (see resolveSearchItem.ts) — a
// confirmed find, an unconfirmed one worth a reach-out offer, or genuinely
// nothing. `text` on "offer"/"nothing" is already a complete sentence.
export type SearchItemOutcome =
  | {
      status: "products";
      products: VendorMatch[];
      matchTier: MatchTier;
      matchQuality: MatchQuality;
    }
  | {
      status: "stores";
      stores: StoreMatch[];
      furtherStores: StoreMatch[];
      matchTier: MatchTier;
      matchQuality: MatchQuality;
      storesQuery: string;
    }
  | { status: "offer"; text: string }
  | { status: "nothing"; text: string; externalSuggestions: NearbyBusiness[] };

// What SearchHome.tsx sends to POST /api/search/resolve-item to resolve
// item B independently, in the background — the exact term(s) the model
// already extracted for it on the main turn, nothing left to interpret.
export type BackgroundSearchItem =
  | {
      type: "product";
      product: string;
      attributes?: string[];
      location?: string;
    }
  | { type: "store"; businessType: string; location?: string };
