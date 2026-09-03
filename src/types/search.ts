// Velte AI search endpoint (build-order step c) — POST /api/search.

export interface BuyerLocation {
  lat: number;
  lng: number;
}

// The conversation's settled location state (Phase 5,
// docs/velte-ai-search-flow-plan.md) — persisted server-side so a refresh
// never re-asks for something the buyer already answered, either way they
// answered it. `lat`/`lng` are null when they chose to search without
// sharing (`declined`), `placeName` is the reverse-geocoded label for
// display only (matching always uses the coordinates).
export interface StoredBuyerLocation {
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  declined: boolean;
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
// avoids restating those, per its system prompt). Since Phase 1
// (docs/velte-ai-search-flow-plan.md) the authoritative copy is rebuilt
// server-side from the persisted conversation's stored turns
// (staffly-ai-backend, same field shape); the client still sends its own
// in-memory copy as the fallback the route uses when persistence is
// unavailable or the client copy is more complete.
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
  // Short query that justified a reach-out offer on this assistant turn
  // (or the name-ask that continues it) — createBuyerRequest matching must
  // use this, not only the long vendor-facing description, or Yes can
  // no_match after an offer that already found sector vendors.
  buyerRequestMatchQuery?: string | null;
  // The products this assistant turn offered to watch the price of, if any
  // (2026-08-29). Set by SearchHome from the turn it actually RENDERED —
  // structured client state, never inferred from the text — for exactly the
  // reason awaitingBuyerRequestReply above is: the route has to know, with
  // certainty, whether a "yes please" has a live offer to attach itself to.
  //
  // Its presence is what gates the watch-intent classifier (see
  // classifyWatchIntentTool.ts). No offer live → that call never runs → the
  // message flows through the ordinary pipeline. Omitted on every other turn.
  watchOffer?: WatchCandidate[];
}

// The scope check's read of WHAT the buyer is trying to do (classifyScope's
// seekingKind) — drives which side of a sector's field pools the bare-query
// attribute gate asks from, and which sectors detection even considers.
// "unclear" falls back to the deterministic task-keyword heuristic.
export type SearchIntentKind = "buy_item" | "get_service" | "unclear";

// How this turn relates to what came before it — the diagram's own "New
// request or follow-up?" box, made a real signal (2026-08-25). Without it
// the model saw one flat transcript and folded EVERY earlier answer into
// every later search: found live, a buyer who had answered "Infinix",
// "black", "brand new" for one item then asked "Where can I get a phone"
// and got a search for "Infinix phone black brand new" — attributes from a
// finished request leaking into a fresh one, and surviving even an
// explicit correction.
//
// "new"        — a different thing is being sought now; the previous
//                request is over. Attributes/details from it must NOT
//                carry over (route.ts drops the earlier turns from what
//                the model sees, rather than trusting it not to reuse
//                them). Location is deliberately NOT reset: it describes
//                the buyer, not the request.
// "refinement" — the same request, adjusted ("in red instead", "cheaper",
//                "any in Lekki?"). Full context carries over.
// "answer"     — a direct reply to something Velte just asked (a
//                clarifying question, a location ask, a reach-out offer).
//                Full context carries over.
export type RequestRelation = "new" | "refinement" | "answer";

export interface SearchRequestBody {
  // Either message or imageUrl must be present — a bare photo with no
  // caption is a first-class case (build-order step e).
  message: string;
  imageUrl?: string;
  buyerLocation?: BuyerLocation;
  // The buyer pressed "Just tell me the price" rather than typing a request
  // (2026-09-03). A structural signal, not left for the server to infer from
  // the wording, for the same reason isContinuation is one.
  //
  // It suppresses the two things a normal search does BEFORE answering:
  // asking for a location, and asking clarifying questions. Both are right
  // when the job is matching a buyer to a vendor and wrong when the job is
  // answering "what does this cost" — found live: "How much should this cost?
  // A plastic standing fan" was met with a location gate, then a request for
  // fan size, speed count and wattage, and never a price.
  priceCheck?: boolean;
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
  // True when `message` is the buyer ANSWERING something already in
  // progress — their typed name (IdentityCapture's own name-capture mode),
  // a plain clarification answer, or the canned "Shared my location" text
  // — rather than a fresh, independent request. A structural signal, not
  // left for the server to guess from the text: found live, the server's
  // own understandingRequestPhrase quoted this kind of text verbatim
  // ("Looking into 'Shared my location'…", "Looking into 'John Okafor'…")
  // since there's no fixed word list that could ever catch an arbitrary
  // typed name — the CLIENT already knows structurally, at the exact
  // moment it calls submitMessage, that this text isn't a fresh query, so
  // it says so directly instead of the server trying to reconstruct that
  // from the string alone. Omitted (falsy) for an ordinary composer
  // submission.
  isContinuation?: boolean;
  // Anonymous per-browser id (localStorage, generateUUID — see
  // src/lib/searchConversation.ts) — the ownership token for the persisted
  // conversation. Omitted when localStorage is unavailable, in which case
  // the whole turn runs exactly like the old stateless flow (no
  // conversation is created, `history` below is what the model sees).
  deviceId?: string;
  // The persisted conversation to continue — absent on the first turn of a
  // fresh session (the server creates one and hands its id back on the
  // final event). A stale/unknown id is not an error: the server just
  // starts a new conversation and returns the new id the same way.
  conversationId?: string;
  // Phase 5 — location state to persist onto the conversation alongside
  // this turn. `locationDeclined` records a deliberate "search without
  // it" (just as worth remembering as a shared position: it's what stops
  // the gate re-asking after a refresh), `locationPlaceName` is the
  // reverse-geocoded label for `buyerLocation` when the client has
  // resolved one. Both omitted on turns where nothing about location
  // changed — the server merges rather than overwrites.
  locationDeclined?: boolean;
  locationPlaceName?: string;
}

// One product Velte is offering to watch the price of (2026-08-29).
//
// A flattened, already-eligible candidate: whichever kind of listing it came
// from, everything a watch needs is on it, so the UI and the create call stop
// caring which. Built ONLY by watchCandidates.ts, which is where the
// eligibility rules live — nothing else should construct one, or the rules
// stop being one thing.
//
// `priceKobo` is non-null by construction. A listing with no usable starting
// price is not a candidate at all (PriceWatch requires startPriceKobo), so
// the absence is handled by exclusion rather than by a nullable field every
// consumer would have to re-check.
/** Which market a price came from. Online and offline are not one market —
 *  see priceBand.ts's header for why blending them is actively harmful. */
export type PriceBandChannelId = "local" | "informal" | "formal";

/** One market's price range for the thing being searched. */
export interface PriceBandChannel {
  id: PriceBandChannelId;
  /** How many listings this range was drawn from. Always surfaced — it is
   *  what makes the band a measurement rather than an oracle. */
  count: number;
  /** Kobo. 25th percentile, middle, 75th percentile. */
  lowKobo: number;
  midKobo: number;
  highKobo: number;
  /** False when there were too few listings to claim a range; the UI shows a
   *  single figure instead of a span it can't support. */
  ranged: boolean;
}

/** A single named price, shown when there is too little to draw a band. */
export interface PriceBandListing {
  label: string;
  priceKobo: number;
  channel: PriceBandChannelId;
  condition: "new" | "used";
  merchant: string | null;
  url: string | null;
}

/** Where a price the buyer NAMED sits against the market (2026-08-31).
 *
 *  "Should I buy this?" — the question that lets Velte be useful to somebody
 *  who already knows what they want and is standing in front of it. Produced
 *  only when the buyer actually quoted a figure; see extractQuotedPrice for
 *  the (deliberately strict) rules on what counts as one. */
export interface PriceVerdict {
  /** The figure the buyer said they were quoted, in kobo. */
  quotedKobo: number;
  /** `good` — at or under the cheap end. `fair` — inside the normal range.
   *  `high` — above it but not wildly. `overpriced` — outside any range we
   *  can explain. Four rungs rather than a good/bad flip because the middle
   *  two are where most real quotes land, and collapsing them would make the
   *  verdict either alarmist or useless. */
  status: "good" | "fair" | "high" | "overpriced";
  /** Which market it was measured against. ALWAYS surfaced: "high for a
   *  Computer Village price" and "high for Jumia" are different claims, and
   *  a verdict that hides which one it made is not checkable. */
  against: PriceBandChannelId;
  /** Kobo above that channel's middle. Negative when the quote is below it. */
  deltaKobo: number;
}

/** What to open at, settle for, and walk away from (2026-08-31).
 *
 *  The Nigerian half of the fair-price feature. A band tells a buyer what
 *  something costs; it does not tell them what to SAY, and in a market where
 *  the posted price is an opening bid and what you pay depends on whether the
 *  trader reads you as knowing the market, that gap is most of the value.
 *
 *  Every number here is arithmetic over the band — no model call, same rule
 *  as priceBand.ts. The model does not phrase it either: the copy is fixed
 *  templates, because advice about someone's money should not be re-improvised
 *  on each render. */
export interface NegotiationBrief {
  /** What is being negotiated, for the block's heading. */
  query: string;
  /** The market these numbers describe, named for the same reason
   *  PriceVerdict.against is. */
  channel: PriceBandChannelId;
  /** Kobo. The opening offer — under the target, so there is room to be
   *  talked up to it. */
  openKobo: number;
  /** Kobo. A good, genuinely achievable outcome. */
  targetKobo: number;
  /** Kobo. Above this, walk — it is outside what this market charges. */
  walkKobo: number;
  /** Why these numbers, in the buyer's terms. Ordered most useful first;
   *  every line is derived from a fact in the band, never invented. */
  points: string[];
  /** One line the buyer can say word for word.
   *
   *  Its own field rather than another `points` entry because it is a
   *  different kind of thing — the points are facts to know, this is a script
   *  to use — and the UI needs to be able to set it apart. It is also the
   *  part people screenshot. */
  openingLine: string;
}

/** The fair-price answer for one turn (2026-08-30). Built by
 *  server/ai/priceBand.ts, which is deterministic — no model call, so this
 *  can never be hallucinated and costs nothing extra to produce. */
export interface PriceBand {
  /** What was priced, for the block's own heading. */
  query: string;
  /** How much we are willing to claim. `band` is the full answer, `rough`
   *  means the spread was wide enough to warrant hedging in the copy, and
   *  `listings` means we found one or two prices and are showing them
   *  rather than pretending to know a market. */
  confidence: "band" | "rough" | "listings";
  /** Per-market ranges, cheapest-first ordering left to the UI. Empty on
   *  `listings`. */
  channels: PriceBandChannel[];
  /** Populated only on `listings`. */
  listings: PriceBandListing[];
  /** Comparable listings behind the whole thing. */
  totalCount: number;
  /** Used/refurb listings seen and deliberately NOT folded in — surfaced as
   *  a caution, since a suspiciously cheap quote is usually one of these. */
  usedCount: number;
  /** Kobo saved by buying from `cheapestChannel` instead of the dearest.
   *  Null when there aren't two comparable markets, or the gap is noise. */
  gapKobo: number | null;
  cheapestChannel: PriceBandChannelId | null;
  /** Where the buyer's own quoted price sits, when they named one.
   *
   *  OPTIONAL, unlike every field above it, and that is about stored turns
   *  rather than taste: conversations persisted before 2026-08-31 have a
   *  `priceBand` with no such key, and they rehydrate into this same type.
   *  Declaring it required would be a lie the UI could crash on. */
  verdict?: PriceVerdict | null;
  /** Whether a negotiation brief can be built from this band at all — it
   *  needs one market with a real range behind it. Decided here rather than
   *  in the component so the rule sits next to the data it judges, and so the
   *  offer can never appear over a band that could not answer it.
   *
   *  Optional for the same rehydration reason as `verdict`. */
  negotiable?: boolean;
}

export interface WatchCandidate {
  kind: "velte" | "external";
  /** productId for a Velte listing, the offer's own id for an external one —
   *  unique within the turn, and what a buyer's selection refers to. */
  id: string;
  productId: string | null;
  url: string | null;
  label: string;
  imageUrl: string | null;
  merchant: string | null;
  priceKobo: number;
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
  // Vendor profile picture (User.avatar) — same field StoreResultCard uses.
  // Null when the vendor hasn't uploaded one; the card falls back to a
  // store icon next to "Sold by".
  avatar: string | null;
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
  // Which businessType search actually surfaced THIS store — route.ts sets
  // it to the exact searchStores call's own `businessType` input (not the
  // turn-level storesQuery) whenever a turn calls searchStores more than
  // once for genuinely different needs in the same message (e.g. "fix my
  // laptop, and a caterer for my wedding" — both phrase as searchStores
  // calls, so they land in the SAME `stores` array — see extractOutcome's
  // own comment on why that's not the dual-intent branch). Null for a
  // store that isn't attributable to one specific call (getVendorStoresForProducts'
  // "Sold by" enrichment, which is a plain vendorId lookup, not a search).
  // StoreResultCard prefers this over its `searchQuery` prop so each card's
  // WhatsApp message reflects what THAT vendor actually matched on, not
  // whichever call happened to run last/be passed down at the turn level.
  matchedQuery: string | null;
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
  // `null` specifically when this came from a genuinely locationless search
  // (buyer declined device location AND named no place) — there's no buyer
  // coordinate to measure a real distance from, so this is omitted rather
  // than a fabricated/misleading number (see googlePlacesFallback in
  // staffly-ai-backend's retrieval.service.js).
  distanceKm: number | null;
}

// A product offer from OUTSIDE Velte (Phase 4,
// docs/velte-ai-search-flow-plan.md) — surfaced only when Velte itself has
// nothing, so a dead end ends with somewhere to go instead of an apology.
// Structurally separate from VendorMatch and never mixed into it: these
// carry no vendor relationship, no WhatsApp handoff, no wallet lead, and
// no trust signal of any kind. The UI must always label them as off-Velte.
//
// Every field is either taken verbatim from the upstream source or null —
// `priceText` in particular stays the source's own STRING ("₦620,000",
// "From ₦89,500") rather than a parsed number, because a mis-parsed price
// shown next to a real vendor's real price is exactly the kind of confident
// wrongness the rest of this system is built to prevent.
export interface ExternalOffer {
  /** Stable within a turn; used for React keys and dedup only. */
  id: string;
  title: string;
  priceText: string | null;
  /** The listing's primary photo — the one the card shows. */
  imageUrl: string | null;
  /** Every OTHER photo on the listing, beyond `imageUrl`. Same role as
   *  VendorMatch.thumbnailUrls; named differently because these arrive at
   *  whatever size the merchant published rather than as thumbnails. Empty
   *  is normal and never an error — the source published one photo, or the
   *  page couldn't be read.
   *
   *  Why a gallery at all (2026-08-27): one photo is not enough to judge a
   *  listing. Reported live on a phone search — the top pick was a Jiji
   *  listing whose FIRST photo was clean and whose later photos showed a
   *  broken screen. Seller-declared condition can't cover for it: all seven
   *  Jiji iPhone 12 listings sampled that day declared "No cracks", so the
   *  photos are the only honest evidence of condition there is. */
  galleryUrls: string[];
  /** The listing's own description as the page published it (og:description
   *  on Jumia, Konga and Jiji alike) — unescaped and clipped, never
   *  rewritten. Null when the page published none. Read for the same reason
   *  as the gallery: it's where a seller's own "UK used", "Grade A" or
   *  "for parts" actually shows up. */
  description: string | null;
  /** The shop selling it ("Jumia", "Konga", …) as the source reported it. */
  merchant: string | null;
  /** Which connector produced this (see ExternalConnector.name). */
  source: string;
  url: string;
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
  // No buyer session at all (2026-08-29, per explicit product direction).
  // Distinct from "needs_identity", which now only ever means "signed in,
  // number not proven yet": posting a Buyer Request requires a real account
  // first, so a stranger has to sign up BEFORE the phone step rather than
  // instead of it. Carries the same `description`/`buyerName` through, so the
  // flow resumes into the phone capture the moment sign-in lands.
  | { status: "needs_signin"; description: string; buyerName: string }
  // A buyer session exists AND the account already carries a verified phone
  // (2026-08-26). The number is shown back to them rather than silently
  // reused: it may be an old one, or a shared phone, and a vendor replying
  // on WhatsApp to the wrong number is a dead lead the buyer never learns
  // about. `phone` is their own verified number — safe to display to them,
  // and never sent to the model (this outcome is read by the frontend, not
  // narrated).
  | {
      status: "needs_phone_choice";
      description: string;
      buyerName: string;
      phone: string;
    }
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

// The strict subset createBuyerRequestTool can actually return (2026-08-26).
// The tool stopped creating anything — the buyer's number has to be settled
// first and only the browser can do that — so it only ever decides which of
// the three capture flows the frontend must run (three since 2026-08-29,
// when signing up became a precondition rather than an alternative). The other three statuses
// still exist on BuyerRequestOffer above because the FRONTEND produces them
// from its own POST /api/buyer-requests, and they ride along on the stored
// turn; they simply never come back from a tool call any more.
//
// A separate type rather than a comment, so the compiler enforces it: the
// deterministic reply text for this turn switches on the status, and a
// silently unhandled case there would render an empty reply.
export type BuyerRequestToolOutcome = Extract<
  BuyerRequestOffer,
  { status: "needs_signin" | "needs_identity" | "needs_phone_choice" }
>;

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
  // Either outcome that hands the turn to this capture — both carry the
  // same `description`/`buyerName` the eventual POST needs.
  offer: Extract<
    BuyerRequestOffer,
    { status: "needs_signin" | "needs_identity" | "needs_phone_choice" }
  >;
  imageUrl: string | null;
  // Same short match query the offer turn used — see SearchHistoryTurn.
  matchQuery: string | null;
  // "signin" — no account yet: the Google button is on screen and the
  // composer is inert, since there is nothing to type. Advances to "phone"
  // the moment a session lands (2026-08-29).
  // "choose" — the account's saved number is on screen with a use-it /
  // use-another pair; the composer stays a plain textarea for it, since
  // there is nothing to type. "phone" and "otp" are the original two.
  //
  // "budget" (2026-09-03) runs LAST, once identity is settled, and is the
  // only step about the REQUEST rather than the buyer. It comes last on
  // purpose: it is the one step a buyer may legitimately skip, and a skip
  // should not leave them staring at a half-finished sign-in.
  step: "signin" | "choose" | "phone" | "otp" | "budget";
  phone: string;
  // Kobo. Null until the budget step resolves, and STILL null if the buyer
  // skips it — a request with no stated budget is valid, and every request
  // made before this existed has none. Never guessed from the description.
  budgetKobo: number | null;
}

// A structured clarifying question from askClarifyingQuestionTool — the
// model's own `reply` text for the turn IS the question itself; this just
// carries the widget metadata needed to render it as buttons or a dedicated
// input instead of plain prose. route.ts guarantees a "choice" clarification
// always has >=2 options (downgrading to "text" server-side otherwise), so
// the frontend never has to re-validate that itself.
export type Clarification =
  // `skippable` — set by route.ts's deterministic bare-query attribute gate
  // (its own code-enforced ask, mirroring the location gate): the buyer can
  // answer through the composer as usual, OR tap the rendered skip pill to
  // search immediately with what they already said — details help matching
  // but must never be a wall (same flexibility the location ask has).
  | { kind: "text"; question: string; skippable?: boolean }
  | { kind: "choice"; question: string; options: string[] }
  // No options — the frontend renders a one-tap "share my location" action
  // (real browser geolocation) plus a plain decline, not buttons built from
  // model-supplied text. See systemPrompt.ts's location rule for when this
  // fires: neither a named place nor a known device location exists for a
  // search that needs one.
  | { kind: "location"; question: string }
  // The createBuyerRequest agreement flow's own name-ask (systemPrompt.ts) —
  // found live asking this as a plain "text" clarification rendered its own
  // separate inline input (ClarificationPrompt), floating apart from the
  // main composer, right before the phone/OTP identity-capture step swaps
  // that SAME composer into a dedicated input of its own. This kind exists
  // so SearchHome.tsx can give the name ask that identical composer-swap
  // treatment instead — no options, same shape as "text" otherwise, just a
  // distinct discriminant so the frontend can tell the two apart.
  | { kind: "name"; question: string }
  // route.ts's dual-intent branch's own pick (2026-08-20, per explicit
  // request — replaces an earlier "product side always goes first"
  // convention): the buyer named two distinct needs in one message, and
  // rather than the app deciding which to resolve first, this hands the
  // choice to them. Exactly 2 entries in practice today (route.ts only
  // ever detects one product term + one store term — see
  // isGenuineDualIntent's own comment), but not typed as a fixed pair:
  // SearchHome.tsx's own pick-handling walks the array generically, so a
  // future real N-way split only has to populate more entries here.
  // `item` is a complete, self-contained spec (already carries its own
  // `location`) — SearchHome.tsx resolves whichever one the buyer picks
  // directly via POST /api/search/resolve-item, no further LLM call
  // needed (every term here was already extracted on THIS turn), and
  // queues the other one exactly like an ordinary deferred background
  // item once the picked one's own flow concludes.
  | {
      kind: "item_pick";
      question: string;
      options: { item: BackgroundSearchItem; label: string }[];
    };

// "Velte's picks" over one turn's product results (Phase 3,
// docs/velte-ai-search-flow-plan.md) — produced by pickRecommendation
// (src/lib/server/ai/recommendResults.ts) ONLY when a turn has ≥2 real
// product results. The model chooses bestOverall/bestValue and writes the
// one-line whys; `nearestId` is CODE-computed from distanceKm, never the
// model's call. Ids are verified against the actual result set before this
// ever leaves the server — a null field just means that pick doesn't apply
// this turn (e.g. bestValue duplicating bestOverall is dropped as
// redundant). Null as a whole when the turn doesn't qualify or the extra
// LLM call failed — rendering must degrade to plain cards, never block on
// this.
export interface SearchRecommendation {
  // The model's own short conversational lead-in for the picks block
  // ("Between these, here's where I'd lean:") — written fresh each turn so
  // it reads like the same voice as the reply, never a canned label.
  // Sanitized server-side like the reasons; null falls back to a small
  // client-side pool (see RecommendationPicks).
  leadIn: string | null;
  bestOverallId: string | null;
  bestOverallReason: string | null;
  bestValueId: string | null;
  bestValueReason: string | null;
  nearestId: string | null;
  // A candidate that's tempting for one reason but carries a real catch —
  // the "cheaper, but it's a different edition" moment. Held to a stricter
  // bar than the picks above: a pick is a judgment, this is a CLAIM about a
  // difference, so the server verifies the id is real AND that the flagged
  // listing actually differs from the top pick before this survives (see
  // differsMeaningfully). Null whenever there's no honest catch to name.
  tradeoff: { productId: string; note: string } | null;
}

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
  // The turn was refused before any work happened because the buyer is out
  // of quota, or the kind of search isn't on their plan at all (2026-08-29,
  // see lib/server/ai/plans.ts). Deliberately NOT an `error`: nothing failed
  // — this is the pricing model working — and it must render as a sign-in or
  // upgrade prompt, never as a red failure state. Terminal for the turn: it
  // arrives alone, with no `final` after it.
  //
  // `reason` decides the wording, and the distinction is worth keeping:
  // "unavailable" means this tier never had it (a guest reaching for photo
  // search — the single best-placed signup prompt in the product),
  // "exhausted" means they used it up and it returns on the 1st.
  | {
      type: "quota";
      message: string;
      kind: "text" | "photo";
      used: number;
      limit: number;
      planId: string;
      planName: string;
      isGuest: boolean;
      /** Which kind of account hit the limit. Drives the CTA: a guest is
       *  offered sign-in, and everyone with an account is offered the
       *  upgrade — vendors included since 2026-08-29, when a plan stopped
       *  requiring a separate buyer account. */
      actorType: "guest" | "buyer" | "vendor";
      reason: "unavailable" | "exhausted";
    }
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
        avatar: string | null;
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
      // Empty except on a genuine DUAL-intent turn (the buyer named a
      // specific item AND a separate kind of business, e.g. "fix my laptop
      // screen, and also a plumber") — see route.ts's own comment on where
      // this branches off the normal single-item flow entirely. Item A
      // (the product-side term, by convention) is resolved to completion
      // and shown normally, this same turn, via the fields above — nothing
      // is held back. This is what SearchHome.tsx queues up next, one at a
      // time, via POST /api/search/resolve-item — but WHEN that first fetch
      // actually starts is entirely SearchHome.tsx's own call, not this
      // turn's: only once item A's own flow concludes (including its own
      // reach-out-offer exchange, if it has one), per explicit design — see
      // SearchHome.tsx's own comment on the background-item bar. No LLM
      // involved in resolving any of it — every term here was already
      // extracted on this same turn, only the search itself is still
      // pending.
      //
      // An array, not a single item, so the client-side queue this feeds
      // (SearchHome.tsx's pendingBackgroundQueueRef) is already shaped to
      // walk N deferred items one after another, not just one — route.ts
      // itself only ever detects and populates exactly one entry today (its
      // dual-intent branch only pairs ONE product term with ONE store term;
      // real 3+-way intent splitting is a separate, not-yet-built piece of
      // work), but the client's own chaining logic doesn't need to change
      // the day that lands.
      backgroundItems: BackgroundSearchItem[];
      // The display label for item A (see backgroundItemLabel's own
      // equivalent in SearchHome.tsx) on a genuine dual-intent turn — null
      // on every ordinary turn. Purely cosmetic: lets the client phrase the
      // background-item bar/status around what item A actually was
      // ("wrapping up X, starting Y next") without having to re-derive it
      // from `reply`'s free text.
      dualIntentItemALabel: string | null;
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
      // Present when this turn offered a Buyer Request (or continues that
      // exchange with a name-ask) — the short term create matching should
      // reuse. Null/omitted otherwise.
      buyerRequestMatchQuery: string | null;
      // Non-null only on a turn with ≥2 product results where the
      // comparison call succeeded — see SearchRecommendation's own
      // comment. Renders as badge chips on the matching cards plus a
      // compact "Velte's picks" summary; plain cards when null.
      recommendation: SearchRecommendation | null;
      // The products Velte is offering to watch the price of, if any
      // (2026-08-29). Drawn from this turn's own recommendation and filtered
      // to what is actually watchable — see watchCandidates.ts. Empty on
      // every turn with no recommendation, and empty is the normal case:
      // an offer with no eligible target is worse than no offer.
      watchOffer: WatchCandidate[];
      // Set ONLY on a turn where the buyer took up a watch offer — the
      // candidates they actually selected (2026-08-29). Non-null is the
      // signal that this turn IS the watch request: the frontend runs the
      // auth/plan/create flow off it, because none of those steps can happen
      // server-side (signing in needs the browser, and so does coming back
      // from Paystack having upgraded mid-conversation).
      watchRequest: WatchCandidate[] | null;
      // Off-Velte product offers (Phase 4) — populated ONLY on a genuine
      // dead end, and only when a connector is configured. Always rendered
      // as clearly not-Velte, with no chat handoff: there's no vendor
      // relationship behind these. Empty on every turn that found anything
      // on Velte at all.
      externalOffers: ExternalOffer[];
      // The fair-price check for this turn (2026-08-30) — what the thing
      // SHOULD cost, per market, drawn from the same listings the cards
      // above came from. Null when there was nothing honest to say, when
      // the category isn't one a band works for (land, services), or when
      // the account's band allowance is spent — a refusal here never fails
      // the turn, it just leaves the block off. See server/ai/priceBand.ts.
      priceBand: PriceBand | null;
      // The persisted conversation this turn was written into (Phase 1 of
      // docs/velte-ai-search-flow-plan.md) — the client stores this and
      // sends it back as SearchRequestBody.conversationId on every later
      // turn, and uses it to rehydrate the conversation after a refresh.
      // Null when the request carried no deviceId or persistence was
      // unavailable — the turn still completed normally, it just wasn't
      // saved.
      conversationId: string | null;
    }
  | { type: "error"; message: string };

// One named intent from a buyer's turn — either a specific PRODUCT/service
// or a kind of BUSINESS/vendor, the same distinction searchProducts/
// searchStores already make, packaged as one value so a single item can be
// resolved on its own (see resolveSearchItem.ts, server-only — this type
// itself lives here, not there, specifically so it stays safe to import
// into a client component like SearchHome.tsx without dragging that
// file's server-only search calls into the client bundle).
//
// `clarified` — true once SearchHome.tsx has already folded a buyer's
// answer to resolveSearchItem's own deterministic clarify round back into
// this item (see that file's own comment) — the hard cap that keeps the
// round to exactly one ask per item, same "ask ONCE" rule
// buildSystemPrompt's sectorNote already holds itself to. Omitted/false on
// the item's first resolution attempt.
export type SearchItemInput =
  | {
      type: "product";
      product: string;
      attributes?: string[];
      clarified?: boolean;
    }
  | { type: "store"; businessType: string; clarified?: boolean };

// The full outcome of resolving one item (see resolveSearchItem.ts) — a
// confirmed find, an unconfirmed one worth a reach-out offer, or genuinely
// nothing. `text` on "offer"/"nothing" is already a complete sentence.
export type SearchItemOutcome =
  | {
      status: "products";
      products: VendorMatch[];
      matchTier: MatchTier;
      matchQuality: MatchQuality;
      // Same recommendation layer the main /api/search path runs (Phase 3)
      // — attached by the resolve-item ROUTE on ≥2 results, never by
      // resolveSearchItem itself, which stays deliberately LLM-free (see
      // its own doc comment). Null on thin results or when the comparison
      // call failed; rendering degrades to plain cards either way.
      recommendation: SearchRecommendation | null;
      // The term this item actually searched for (searchItemTerm's own
      // output) — mirrors "stores"' own storesQuery below. Lets
      // SearchHome.tsx's resolveBackgroundItem say what was found ("Found a
      // real match for 'caterer'…") instead of a bare "Found a real match
      // on Velte for that…" that reads fine as the buyer's only open
      // request but goes ambiguous the moment a SECOND item (dual-intent
      // item B, or any later background item) is also in flight this
      // session — same class of bug noVendorEvenBySectorPhrase's own
      // comment already fixed for the "nothing" case.
      query: string;
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
  | { status: "nothing"; text: string; externalSuggestions: NearbyBusiness[] }
  // One deterministic clarify round for a genuinely bare item — see
  // resolveSearchItem.ts's own comment on why this is safe to do WITHOUT an
  // LLM call (sector detection is plain token-matching, already used by
  // buildSystemPrompt's sectorNote). Per explicit request, this fires for
  // ANY item resolved through this deterministic path, not just a
  // dual-intent one — SearchHome.tsx folds the buyer's reply back into a
  // new item (with `clarified: true` set) and resolves it again, exactly
  // once; resolveSearchItem.ts never returns this a second time for the
  // same item.
  | { status: "needs_clarification"; question: string };

// What SearchHome.tsx sends to POST /api/search/resolve-item to resolve
// item B independently, in the background — the exact term(s) the model
// already extracted for it on the main turn, nothing left to interpret.
// `clarified` mirrors SearchItemInput's own field — see its comment.
export type BackgroundSearchItem =
  | {
      type: "product";
      product: string;
      attributes?: string[];
      location?: string;
      clarified?: boolean;
    }
  | {
      type: "store";
      businessType: string;
      location?: string;
      clarified?: boolean;
    };

// ── Persisted conversations (Phase 1, docs/velte-ai-search-flow-plan.md) ──
//
// One completed exchange, as stored in staffly-ai-backend's
// SearchConversation collection: everything SearchHome.tsx needs to
// re-render the turn after a refresh, which is deliberately the same shape
// as its own ConversationTurn minus the client-only ephemera (id, phase,
// status shimmer, blob-URL image preview, error/stopped flags — a failed or
// stopped turn is never persisted at all). Two writers conform to this one
// shape: /api/search/route.ts persists its own turn server-side right after
// emitting the final event (via buildTurnSnapshot), and SearchHome.tsx
// persists the client-resolved turns the route never sees (background
// items, their clarify rounds) through the BFF conversation route.
// Identity-capture turns (phone/OTP) are deliberately NEVER persisted in
// either direction — see SearchHome.tsx's ephemeral flag.
export interface StoredSearchTurn {
  query: string;
  imageUrl: string | null;
  reply: string;
  toolCalled: boolean;
  clarification: Clarification | null;
  backgroundClarifyItem: BackgroundSearchItem | null;
  products: VendorMatch[];
  weakProducts: VendorMatch[];
  stores: StoreMatch[];
  furtherStores: StoreMatch[];
  storesQuery: string | null;
  productStores: StoreMatch[];
  storeServices: VendorMatch[];
  productsMatchTier: MatchTier;
  storesMatchTier: MatchTier;
  productsMatchQuality: MatchQuality;
  storesMatchQuality: MatchQuality;
  externalStoreSuggestions: NearbyBusiness[];
  vendorProducts: StoreProductItem[];
  vendorProductsStore: {
    name: string;
    handle: string;
    whatsapp: string | null;
    vendorId: string;
    avatar: string | null;
  } | null;
  buyerRequestOffer: BuyerRequestOffer | null;
  buyerRequestOffered: boolean;
  interimReplies: string[];
  awaitingBuyerRequestReply: boolean;
  buyerRequestMatchQuery: string | null;
  contextNote: string | null;
  recommendation: SearchRecommendation | null;
  // See the stream event's own note — the same list, carried on the stored
  // turn so a reopened conversation can still act on an offer it made.
  watchOffer: WatchCandidate[];
  watchRequest: WatchCandidate[] | null;
  externalOffers: ExternalOffer[];
  // Persisted like every other block so a reopened conversation renders
  // exactly what the live turn rendered — the invariant searchTurnSnapshot.ts
  // exists to hold.
  priceBand: PriceBand | null;
}

// The active shopping task's lifecycle — derived server-side (staffly-ai-
// backend's appendTurn controller, the single writer) from each appended
// turn's snapshot, never set directly by a client. "handed_off" is part of
// the contract but nothing sets it yet — wiring it to the WhatsApp-click
// lead beacon is follow-up work noted in the Phase 1 plan.
export type ConversationTaskStatus =
  | "gathering"
  | "presented"
  | "dead_end"
  | "handed_off";

// The structured "what is this buyer currently trying to get done" record
// (Phase 1 keeps it thin — the raw query + counts; Phase 2's DB-backed
// attribute schemas are what make it richly structured).
export interface ConversationTask {
  status: ConversationTaskStatus;
  // The buyer's most recent non-continuation message text.
  query: string;
  storesQuery: string | null;
  productCount: number;
  storeCount: number;
  // ── The goal sheet ──────────────────────────────────────────────────
  // What this request is actually after, accumulated across its turns and
  // wiped when a new request begins. It's what lets "can you find
  // something cheaper?" work off a real number instead of the model
  // re-reading its own last reply.
  //
  // `itemTerm` is the second of two locks (the first is requestRelation):
  // a remembered budget only applies while the sheet's own item still
  // matches what's being asked about, so a ₦700k PS5 ceiling can never
  // quietly narrow a later fridge search. A price named in the current
  // message outranks both.
  itemTerm: string | null;
  maxBudgetNaira: number | null;
  attributes: string[];
  shownProductIds: string[];
  cheapestSeenNaira: number | null;
  updatedAt: string;
}

// One row of the buyer's chat history (2026-08-26) — GET
// /api/search/conversations. Deliberately NOT a StoredConversation: a
// stored turn carries the whole denormalised result set it rendered, so a
// list of them would be megabytes to draw a sidebar of titles. Opening a
// row still goes through the by-id endpoint, which returns the real thing.
export interface SearchConversationSummary {
  conversationId: string;
  // The buyer's own first message, or "[sent a photo]" for a bare photo
  // turn — whatever they'd recognise the thread by. Never model-authored.
  title: string;
  turnCount: number;
  // The shopping task's terminal state, when one was recorded — lets the
  // list mark a thread that ended in a real vendor handoff.
  status: ConversationTaskStatus | null;
  lastActiveAt: string;
  createdAt: string | null;
}

export interface SearchConversationList {
  conversations: SearchConversationSummary[];
  // Cursor for the next page (keyset on lastActiveAt), or null when this
  // page didn't fill — i.e. there is nothing more to ask for.
  nextBefore: string | null;
}

// GET /api/search/conversation's payload — what SearchHome.tsx rehydrates
// from after a refresh.
export interface StoredConversation {
  conversationId: string;
  turns: StoredSearchTurn[];
  task: ConversationTask | null;
  // Seeds SearchHome's shownStatusesRef on rehydrate so status-phrase
  // repeat avoidance survives the refresh too.
  recentStatuses: string[];
  // Seeds buyerLocationRef/locationDeclinedRef on rehydrate — the Phase 5
  // payoff: a resumed conversation never re-asks for location.
  buyerLocation: StoredBuyerLocation | null;
  lastActiveAt: string;
}
