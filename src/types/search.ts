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
  // The OPPOSITE-shaped sibling of awaitingBuyerRequestReply (2026-09-15) —
  // that one fires on a DEAD END ("want me to reach out to a business on
  // your behalf?", nothing shown, a later Buyer Request is what notifies
  // someone). This fires when real PRODUCT results WERE just shown (a
  // Velte match, or real online listings on a dead-end turn) and this
  // turn's reply asks whether the buyer would rather have a vendor
  // make/provide the item directly instead of buying one of the products
  // shown as-is — common for anything as often custom-made as bought
  // ready-made (Ankara wear, agbada, aso-ebi, cakes, furniture). True only
  // on the turn making that offer; false on every other turn, including
  // the turn that actually runs the agreed-to searchStores call. Same
  // "structural fact, never guessed from prose" reasoning as
  // awaitingBuyerRequestReply.
  awaitingVendorSearchOffer?: boolean;
  // The businessType/product term this offer was about — what the
  // agreement turn actually calls searchStores with, since the buyer's own
  // "yes" names nothing itself. Set alongside awaitingVendorSearchOffer;
  // null/omitted otherwise.
  vendorSearchMatchQuery?: string | null;
  // Same pattern as awaitingBuyerRequestReply above, for the OTHER
  // two-step exchange (2026-09-09): a fresh comparison between DIFFERENT
  // items (e.g. "iPhone vs Samsung") is answered conversationally, from the
  // model's own knowledge, with no Velte search at all — see route.ts's own
  // "fresh compare turn" short-circuit. That reply ends by asking whether
  // the buyer wants the recommended pick found on Velte, and this flag is
  // what routes their very next message back through that same exchange
  // rather than treating "yes" as a brand-new, contentless request.
  // Omitted for every other turn.
  awaitingComparisonPurchaseReply?: boolean;
  // The exact item name the comparison recommended (route.ts's own
  // comparisonPickTool output) — what the confirmation turn actually
  // searches Velte for, since the buyer's own "yes" names nothing itself.
  // Null/omitted otherwise.
  comparisonPickItem?: string | null;
  // EVERY alternative named in the fresh comparison this turn answered
  // (route.ts's own comparisonOptions, the full list, not just the
  // recommended pick) — set alongside comparisonPickItem/
  // awaitingComparisonPurchaseReply on the SAME turn (2026-09-15, found
  // live). What lets a LATER message, even after an intervening dead-end
  // turn, resolve "the other one"/"try the other option" back to whichever
  // named alternative wasn't just searched — see route.ts's own
  // rememberedComparisonOptions for the request-scoped scan that reads
  // this back out. Null/omitted on every other turn.
  comparisonOptions?: string[] | null;
  // True when this turn's `content` came from suggestBuyingGuidance — see
  // the matching field's own comment on the "final" event type above.
  // Omitted for every other turn.
  isGuidanceReply?: boolean;
  // Structural markers for "was location/budget already asked this
  // conversation" (2026-09-09) — route.ts's own alreadyAskedLocation-/
  // BudgetThisConversation used to scan `content` for fixed keyword
  // patterns (LOCATION_CLARIFY_PATTERN / BUDGET_CLARIFY_PATTERN), but both
  // gates deliberately tell the model to phrase the question in its own
  // words ("Write question naturally... no fixed wording") — found live: a
  // location ask phrased as "I just need to know where to search so I can
  // find listings near you" contains none of the regex's trigger words
  // (city/area/location/...), so the scan missed it and the very next
  // turn asked again, freshly worded. Set directly from the turn's own
  // `clarification` (kind "location" for the location ask; kind "text"
  // with `skippable: true` is the bare-query budget gate's own unique
  // signature — nothing else in this file sets skippable), never guessed
  // from prose — same "a known fact beats a model's reading of it"
  // rule awaitingBuyerRequestReply above already follows. Omitted for
  // every other turn.
  askedLocation?: boolean;
  askedBudget?: boolean;
  // Shopping Plan (2026-09-18) — set from the turn's own `clarification`
  // (`deadlineAsked: true`, that gate's unique signature), same "known
  // fact, not guessed from prose" rule as askedLocation/askedBudget above.
  // Lets route.ts tell "this reply answers the deadline question" apart
  // from a brand-new request, so the buyer's answer gets combined onto
  // the original request rather than treated as one on its own.
  askedDeadline?: boolean;
  // Shopping Plan (2026-09-19) — the budget ask's own pair, mirroring
  // askedDeadline exactly. `shoppingPlanPendingGoalText`/
  // `shoppingPlanPendingDeadlineDate` are stamped on the SAME assistant turn
  // that asks for budget, carrying forward what this flow had already
  // resolved (the goal text possibly itself recovered from an earlier
  // deadline-answering hop, and the deadline just resolved this turn) — so
  // that when the buyer's reply names only a budget figure, route.ts reads
  // these back structurally instead of re-deriving them from
  // lastSubstantiveUserMessage a second time, which only ever walks back one
  // clarification hop and would land on the deadline reply ("by Friday"),
  // not the original request, once budget becomes a SECOND chained ask.
  askedShoppingPlanBudget?: boolean;
  shoppingPlanPendingGoalText?: string | null;
  shoppingPlanPendingDeadlineDate?: string | null;
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
  // The composer's "+" tool badge (2026-09-06) — the buyer explicitly
  // picked one of a small set of shopping tools before typing (see
  // ComposerTool), rather than this being guessed from the words alone.
  // Unlike every other field here, this is a PROMISE the server has to
  // enforce, not just a hint: route.ts runs a dedicated alignment check
  // before the ordinary pipeline, and politely declines a message that
  // doesn't actually match the selected tool rather than quietly
  // reinterpreting it. Omitted for an ordinary composer submission.
  activeTool?: ComposerTool;
}

// The small, fixed set of shopping-journey tools the composer's "+" menu
// offers (2026-09-06) — deliberately narrower than the 9-capability model
// in the standing "shopping consultant" design doc: Search/Fair Price/
// Negotiate/Check Seller/Find Nearby are reachable by just typing or by
// the model's own judgement mid-conversation, so giving them a SEPARATE
// selectable slot would be a second way to do the same thing. Photo search
// is its own composer affordance (triggers the file picker directly, no
// badge, no "mode") and isn't a ComposerTool for that reason — see
// SearchHome.tsx's own tool-menu comment.
//
// "shopping_plan" (2026-09-18) rejoined this list as an explicit pick, not
// just an auto-detected deadline — a buyer who already knows they want a
// tracked, background-monitored plan shouldn't have to phrase a message
// that happens to trip the deadline detector. Priced discretely (see
// credits.ts's own `shopping_plan` entry), unlike "compare" below.
export type ComposerTool = "compare" | "shopping_plan";

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
  // Which ONE of `sectors` above this search actually turned up on, if any
  // (2026-09-22, staffly-ai-backend's own bestMatchingSector) — a
  // best-effort, phrase-level explanation of a real embedding/rerank match,
  // never a second scoring pass. StoreResultCard pins this sector into its
  // visible pills rather than always showing a store's first 3 — found
  // live: a vendor's real-estate sector, the one reason a "plot of land"
  // search matched it at all, sat 4th in the array and never rendered.
  // null when nothing recognisably overlaps (a pure semantic match with no
  // explainable keyword phrase) — the card falls back to its own default
  // ordering in that case, never a guess.
  matchedSector: string | null;
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
  // Same per-call tagging as matchedQuery, for the service-specific details
  // the buyer already gave (2026-09-17) — timeframe, event date, a
  // distinguishing spec, budget, and the like, gathered from searchStores'
  // own attributes/maxBudgetNaira input. NEVER used for matching (this
  // search runs on businessType alone) — purely so StoreResultCard's
  // WhatsApp handoff can hand the vendor real context instead of a bare
  // "I'm interested in what you offer", the same way a vendor who already
  // has a product LISTING gets the buyer's specifics for free from the
  // listing itself. Empty/null respectively when nothing was actually
  // stated — never guessed or filled in.
  matchedAttributes: string[];
  matchedBudgetNaira: number | null;
}

// A real nearby business from Google Places — Tier 3 of searchStores, only
// populated when no Velte vendor matched at all. Deliberately thin (no
// handle, no Velte "trust") since it's not a Velte entity: no relationship
// to hand a "Chat on WhatsApp" CTA off to (`phone` below is a plain `tel:`
// link, never a WhatsApp deep link — Velte has no idea whether Google's
// number is even a WhatsApp number, unlike a vendor's own `whatsapp` field).
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
  // Both optional on a real Google listing (2026-09-17) — null, never a
  // guess, when Google has neither on file. See googlePlaces.service.js's
  // own header for the pricing tier these add (Enterprise SKU, one tier up
  // from the Pro-tier fields above — both together cost the same as either
  // alone, since billing is by the highest tier any requested field
  // touches).
  phone: string | null;
  website: string | null;
}

// A real, PUBLIC Instagram business page turned up by a scoped Google
// search (site:instagram.com "<businessType>" "<location>") on a genuine
// store dead end — nothing on Velte, no real Google Places result either
// (2026-09-15, explicit request). Many small Nigerian vendors (caterers,
// tailors, event stylists) run entirely off an Instagram page with no
// website and no Google Places listing at all, so this is a third tier of
// "somewhere to point the buyer", not a replacement for either of the
// other two.
//
// Deliberately thin, same reasoning as NearbyBusiness: no handle Velte
// trusts, no WhatsApp CTA, no verified address or coordinates — a plain
// Google search result naming a page that MENTIONS the business type and
// location, nothing more. This is a PUBLIC search result only — no login,
// no session, no scraping of anything Instagram gates behind
// authentication (see connectors/instagramBusinessSearch.ts's own header
// for why that boundary matters here).
export interface InstagramLead {
  /** The profile page itself (instagram.com/<handle>), never a post/reel/
   *  hashtag page — see the connector's own filter for why only a profile
   *  qualifies as a real business page. */
  url: string;
  /** The bare handle out of `url` (2026-09-16) — what the "Message on
   *  Instagram" action needs: Instagram's DM deep link is ig.me/m/<handle>,
   *  and it takes no prefilled text, so the card copies a Velte intro
   *  message to the clipboard and opens the thread. Optional only because
   *  leads persisted before this shipped have none — the card falls back
   *  to a plain profile link for those. */
  handle?: string;
  /** Google's own result title — usually "Business Name (@handle) •
   *  Instagram photos and videos", kept whole rather than parsed apart. */
  title: string;
  /** Google's own snippet, when it has one (often a bio excerpt). */
  snippet: string | null;
  /** What was searched to find this lead (the businessType), and the place
   *  the buyer named, if any — carried ON the lead so the card can write
   *  the intro message ("I'm looking for a caterer in Enugu") without
   *  reaching back into the turn. Both optional for the same pre-shipping
   *  reason as `handle`. */
  need?: string;
  location?: string | null;
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
//
// `priceText` and `imageUrl` specifically can come from either of two
// places — the search API's own snapshot (Google Shopping, cached at
// crawl time) or the product PAGE `url` actually points to (read fresh,
// same turn) — and the PAGE wins whenever it has an answer (2026-09-14,
// corrected after the reverse produced a card whose photo didn't match
// its own gallery or the page it linked to; see connectors/serper.ts's
// own comment on the live case that caught it). The snapshot is only ever
// the fallback, for a page that's slow, blocked, or genuinely has
// neither.
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
  /** The listing's own description as the page published it (og:description,
   *  read the same way on every merchant in the connector's list) —
   *  unescaped and clipped, never rewritten. Null when the page published
   *  none. Read for the same reason as the gallery: it's where a seller's
   *  own "UK used", "Grade A" or "for parts" actually shows up. */
  description: string | null;
  /** Real spec attributes the listing's own page published — Condition,
   *  Storage, RAM, Camera, and so on. Same shape as VendorMatch.attributes,
   *  for the same reason: it's genuinely structured data the seller filled
   *  in, not marketing copy. Empty is normal, not an error — currently
   *  always empty: no merchant in the connector's current Shopify/
   *  WooCommerce-only list (2026-09-13, see connectors/serper.ts) has a
   *  verified attribute extractor written for it yet. See
   *  connectors/pageMeta.ts's own comment on why this exists at all — a
   *  400-character og:description blurb was never going to say "6GB RAM,
   *  128GB storage, Used, no cracks", and this is where that actually
   *  lives on the page. */
  attributes: { name: string; value: string }[];
  /** The shop selling it ("Slot", "Electromart", "Jumia", "Jiji", …) as the
   *  source reported it — a NAMED merchant from connectors/serper.ts's list
   *  (Jumia, or a Shopify/WooCommerce Nigerian store), or "Jiji" from its own
   *  dedicated connector (connectors/jiji.ts, 2026-09-21). */
  merchant: string | null;
  /** Which of the buckets this belongs to in the "off Velte" results UI
   *  (2026-09-14, Jiji added as a fourth 2026-09-20) — see
   *  connectors/serper.ts's Merchant.platform for the full reasoning on
   *  jumia/shopify/woocommerce. `"jiji"` is still its own bucket, even
   *  though connectors/jiji.ts (2026-09-21) can now match a real, individual
   *  listing with real photos rather than only ever producing a plain search
   *  link: those three are structured retailer product pages, and a Jiji
   *  match is one person's own classifieds ad (see that file's own header
   *  on the live incident — a clean first photo, damage in a later one —
   *  that's why the FULL gallery, not just `imageUrl`, matters so much more
   *  for this platform than for the other three). A merchant whose platform
   *  can't be told apart (the generic URL-shape-only match) never produces
   *  an offer at all, rather than guessing which bucket it belongs in — so
   *  every offer that exists here has one. */
  platform: "jumia" | "shopify" | "woocommerce" | "jiji";
  /** Which connector produced this (see ExternalConnector.name). */
  source: string;
  url: string;
  /** Whether `url` is this exact listing's own product page. True for
   *  everything the connector actually matches (2026-09-14, explicit
   *  product decision: an offer that can't be confidently matched to a real
   *  product page is dropped entirely rather than falling back to the
   *  merchant's own search page — no more "View on Slot" that actually
   *  lands on a results page for the item's name). Also true for a
   *  real Jiji listing match (2026-09-21, connectors/jiji.ts) — it links
   *  straight to that ad's own page, same as any other direct link; FALSE
   *  only for Jiji's own last-resort fallback (a plain search-results link,
   *  used when nothing on the page matched or it couldn't be read at all —
   *  see that file's own buildSearchFallback). This is exactly the "future
   *  source that CAN'T always produce a direct link" this field was
   *  originally kept around for. */
  isDirectLink: boolean;
  /** True when this offer is priced ABOVE the buyer's stated
   *  `maxBudgetNaira` and is only here because nothing affordable filled
   *  the list on its own (2026-09-22 — see connectors/index.ts's own
   *  fetchExternalOffers for the fallback that sets this). Never set when
   *  no budget was given, or when the offer's own price is within it or
   *  unparseable. `ExternalOfferCard` reads this to label the mismatch
   *  plainly rather than let a buyer discover it only after tapping
   *  through — the same "never let a claim look more confident than it is"
   *  rule this whole file already follows for match quality/direct links. */
  overBudget?: boolean;
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
  // `budgetAsked` — the bare-query gate's own report of whether THIS
  // specific question actually asked about budget (2026-09-17). Budget
  // stopped being unconditional the same day: a bounded service (a
  // mechanic, a repair) is priced by diagnosing the problem, not by what
  // the buyer chooses to spend, so bareQueryGate.ts may skip it and ask
  // about the actual problem/need instead. Only meaningful alongside
  // `skippable: true` (this gate's own signature) — staffly-ai-backend's
  // askedBudget is derived from BOTH together, so a non-budget bare-query
  // ask no longer blocks a later, genuinely budget-relevant ask within the
  // same request (see alreadyAskedBudgetThisConversation's own comment).
  // `deadlineAsked` — Shopping Plan's own dedicated deadline gate
  // (2026-09-18, route.ts, distinct from bareQueryGate): its own unique
  // signature, mirroring `budgetAsked` — nothing else sets it, so route.ts
  // can tell "this reply answers the deadline question" apart from an
  // ordinary text clarification's answer just by shape, never by scanning
  // the (freely-worded) question text.
  | {
      kind: "text";
      question: string;
      skippable?: boolean;
      budgetAsked?: boolean;
      deadlineAsked?: boolean;
      // Shopping Plan's own dedicated (and, unlike the two above, NOT
      // skippable) budget ask — its own unique signature, same reasoning as
      // deadlineAsked's own comment. `shoppingPlanPending*` ride along on
      // the SAME object, carrying what this flow had already resolved (the
      // goal text, possibly itself recovered from an earlier deadline
      // hop, and the deadline) forward to the reply that answers this
      // question — see SearchHistoryTurn's own matching pair for why a
      // second chained ask can't just re-derive these from prose the way
      // the single-hop deadline ask gets away with.
      shoppingPlanBudgetAsked?: boolean;
      shoppingPlanPendingGoalText?: string | null;
      shoppingPlanPendingDeadlineDate?: string | null;
    }
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

// The full "Universal Comparison Template" (2026-09-05) — built ONLY on a
// genuine COMPARE turn: the buyer explicitly selected the Compare tool (and
// toolAlignment.ts confirmed it fits), or classifyScopeTool detected the
// same thing unprompted from plain text. Every other multi-result turn
// keeps the lighter SearchRecommendation above unchanged.
//
// A strict SUPERSET of SearchRecommendation on purpose — every existing
// consumer (pickBadgesFor, the client's own fallback lead-in) keeps working
// unmodified on a comparison turn, because a
// ComparisonTemplate IS a SearchRecommendation structurally, just with the
// extra fields the richer template needs. See AnyRecommendation below and
// isComparisonTemplate for how a turn's `recommendation` field is told apart.
//
// Same division of labor as SearchRecommendation: the MODEL judges fit,
// names criteria, and writes the one-line/one-paragraph verdicts; CODE
// decides everything checkable (each row's name/price/source, `nearestId`,
// id verification, sanitizing). See comparisonTemplate.ts's own comment.
export interface ComparisonTemplate extends SearchRecommendation {
  // Said OUT LOUD when what's being compared isn't quite what the buyer
  // literally named (2026-09-05, found live: "Toyota 2026 vs Lexus Jeep
  // 2026" — Lexus makes no vehicle called "Jeep" — quietly turned into a
  // table of Highlander/Camry/RAV4/TX 350, with nothing telling the buyer
  // their exact wording wasn't what got compared). One honest sentence,
  // e.g. "I couldn't find an exact 'Lexus Jeep 2026' listing, so I've
  // compared the closest Lexus SUVs against comparable 2026 Toyotas
  // instead." — placed ABOVE the table, before any number is shown, so the
  // substitution is disclosed before it's relied on, not buried in a
  // caption under it.
  //
  // null when the candidates genuinely are what was asked for — this is a
  // disclosure of a GAP, never filler on an exact match, and forcing one
  // out of the model on every turn is how a "nothing to disclose" turn
  // ends up with an invented one anyway.
  substitutionNote: string | null;
  // What THIS request's own words made worth weighing — the model's dynamic
  // criteria list ("price", "battery life", "camera"), never a fixed set:
  // a "cheapest X" ask weighs price: a "best for video" ask weighs
  // performance. 2-5 short phrases, buyer-facing as written.
  criteria: string[];
  // One row per candidate actually shown (capped — see comparisonTemplate.ts),
  // for the "Compare your options" table. `name`/`priceLabel`/`source` are
  // pulled from the real candidate data, never the model's own words for
  // those three; `bestFor`/`keyStrength`/`mainDrawback` are its one-line
  // judgments, sanitized like every other reason field here.
  rows: ComparisonRow[];
  // A third, DYNAMICALLY labeled pick beyond bestOverall/bestValue — e.g.
  // "Best for video", "Best portfolio", "Fastest available" — whatever axis
  // this request's own criteria actually turned up as worth a separate call-
  // out. null when nothing stood out beyond the first two picks.
  thirdPickLabel: string | null;
  thirdPickId: string | null;
  thirdPickReason: string | null;
  // The fuller "My recommendation" paragraph — a couple of sentences
  // personalized to what the buyer actually asked for, distinct from
  // bestOverallReason (which stays a short one-liner for the pick itself).
  recommendationNote: string | null;
  // "Choose X if…" lines — one per candidate worth guiding on (the picks
  // only, never every row), so the buyer can place themselves rather than
  // just being told a single winner.
  guidance: { id: string; condition: string }[];
}

// One candidate's row in a ComparisonTemplate's table.
export interface ComparisonRow {
  id: string;
  name: string;
  priceLabel: string;
  // Where this option actually is ("Lekki, Lagos · 3.2km away"), built in
  // CODE from the candidate's own area/state/distanceKm — null when there's
  // nothing real to say (an online listing, a nationwide match with no
  // buyer coordinate to measure from).
  //
  // The design doc's option structure also lists Availability and
  // Reviews/reputation. Both are deliberately ABSENT: Velte holds no stock
  // level, no calendar, and no review data for any vendor, so those columns
  // could only ever render blank or be invented — and an invented
  // "Available now" on a comparison someone is about to spend money on is
  // exactly the failure this codebase's every other guard exists to stop.
  // They belong here the moment there is real data behind them, not before.
  location: string | null;
  // Constant across every row in today's boundary (a turn is only ever
  // Velte results OR external offers, never both — see comparisonTemplate.ts's
  // own comment on why the source merge stays out of scope), but kept
  // per-row rather than turn-level so a future merge of both into one
  // comparison needs no shape change here, only a real mix of values.
  source: "velte" | "external";
  bestFor: string | null;
  keyStrength: string | null;
  mainDrawback: string | null;
}

// What a turn's `recommendation` field actually holds — either shape reads
// safely through SearchRecommendation's own fields; only a genuine compare
// turn ever carries the richer one.
export type AnyRecommendation = SearchRecommendation | ComparisonTemplate;

/** Distinguishes the two recommendation shapes above — `criteria` only ever
 *  exists on a ComparisonTemplate. */
export function isComparisonTemplate(
  r: AnyRecommendation,
): r is ComparisonTemplate {
  return "criteria" in r;
}

// Shopping Plan (2026-09-18, widened 2026-09-19 per explicit product
// direction) — a persistent, deadline-driven mission (deadline 2+ days away
// — SHOPPING_PLAN_MIN_DAYS in route.ts), distinct from an ordinary
// single-turn search. Originally a deliberately LIGHT confirmation shape
// carrying only a count; now carries the actual item labels too, so the
// chat turn itself reads as a real shopping list the buyer can act on
// (asking to add/remove an item right there), not just a receipt pointing
// elsewhere. The detailed candidate/price-history data still lives entirely
// server-side on the backend's ShoppingPlan document and is fetched by the
// Shopping Plans page directly, never carried through this turn — this is
// still not that.
export interface ShoppingPlanSnapshot {
  planId: string;
  goalText: string;
  /** ISO date (YYYY-MM-DD). */
  deadlineDate: string;
  /** Always a real, buyer-stated figure by the time a plan exists — see
   *  route.ts's own budget-ask gate. Never a model estimate. */
  budgetNaira: number;
  itemCount: number;
  items: { label: string; quantity: number }[];
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
  // "exhausted" means they used it up and it returns on the 1st, and
  // "network_limited" (2026-09-05) means a shared ADDRESS, not this one
  // browser's own balance, tripped the guest network backstop — see
  // lib/server/guestNetworkGate.ts. Not read by anything's rendering today
  // (the server-composed `message` is what's actually shown), but kept
  // accurate rather than folded into "exhausted" because the two are
  // genuinely different facts and this is exactly the field that exists to
  // record which one happened.
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
      reason: "unavailable" | "exhausted" | "network_limited";
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
      // Public Instagram business pages found on a genuine STORE dead end
      // (2026-09-15) — see InstagramLead's own comment and
      // connectors/instagramBusinessSearch.ts. Always empty on a product-
      // only dead end; only ever populated alongside externalStoreSuggestions
      // by the same cross-check block in route.ts.
      instagramLeads: InstagramLead[];
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
      // See SearchHistoryTurn's own matching field — the opposite-shaped
      // sibling of the pair above (2026-09-15): true when THIS turn's
      // reply asked whether the buyer would rather have a vendor
      // make/provide a just-shown product directly, instead of buying one
      // of the shown items as-is.
      awaitingVendorSearchOffer: boolean;
      vendorSearchMatchQuery: string | null;
      // Same shape as the pair above, for the fresh-comparison short-circuit
      // (2026-09-09) — see SearchHistoryTurn's own comment on both fields.
      // True only on the turn that just answered a genuine "X vs Y"
      // comparison conversationally and asked whether to find the pick on
      // Velte; false on every other turn, including the confirmation turn
      // itself once it runs the real search.
      awaitingComparisonPurchaseReply: boolean;
      // The recommended item's name, set alongside
      // awaitingComparisonPurchaseReply — null/omitted otherwise.
      comparisonPickItem: string | null;
      // See SearchHistoryTurn's own matching field. Optional (unlike its
      // required sibling above) for the same reason isGuidanceReply just
      // below is — a new field added after most call sites already existed.
      comparisonOptions?: string[] | null;
      // True when `reply` came from suggestBuyingGuidance — real-world
      // brand/model suggestions on a genuine Velte dead end, general
      // knowledge rather than a confirmed Velte result (2026-09-15). Lets
      // SearchHome.tsx tell this apart from an ordinary reply, and from a
      // genuine empty dead end with no suggestions at all — both of which
      // used to render identically. See SearchHistoryTurn's own matching
      // field, which SearchHome.tsx copies this into for the next call's
      // `history`.
      isGuidanceReply?: boolean;
      // Non-null only on a turn with ≥2 product results where the
      // comparison call succeeded — see SearchRecommendation's own
      // comment. Renders as badge chips on the matching cards plus a
      // compact "Velte's picks" summary; plain cards when null.
      recommendation: AnyRecommendation | null;
      // The goal sheet's own remembered budget ceiling, in naira, as it
      // stands going into THIS turn — injected once, by sendFinal itself,
      // onto every final event (2026-09-10), never set per call site. What
      // it's actually FOR: the buyer-request identity-capture flow's own
      // "budget" step (SearchHome.tsx) reads it off the OFFER turn so it
      // can skip re-asking a figure the buyer already gave earlier in this
      // same conversation — found live, "office fit-out, ₦10,000,000
      // budget" asked again for a budget during the WhatsApp-verification
      // step. Null whenever nothing's been established yet.
      knownBudgetNaira: number | null;
      // Non-null only on the turn that just created a Shopping Plan (see
      // ShoppingPlanSnapshot's own comment) — renders a confirmation card
      // in place of the ordinary products/stores rendering; null/omitted
      // on every other turn, including every turn of that plan's own later
      // background monitoring, which never appends back into this chat.
      // Optional, same reasoning as comparisonOptions above — added after
      // most call sites already existed.
      shoppingPlan?: ShoppingPlanSnapshot | null;
      // Off-Velte product offers (Phase 4) — populated ONLY on a genuine
      // dead end, and only when a connector is configured. Always rendered
      // as clearly not-Velte, with no chat handoff: there's no vendor
      // relationship behind these. Empty on every turn that found anything
      // on Velte at all.
      externalOffers: ExternalOffer[];
      // The persisted conversation this turn was written into (Phase 1 of
      // docs/velte-ai-search-flow-plan.md) — the client stores this and
      // sends it back as SearchRequestBody.conversationId on every later
      // turn, and uses it to rehydrate the conversation after a refresh.
      // Null when the request carried no deviceId or persistence was
      // unavailable — the turn still completed normally, it just wasn't
      // saved.
      conversationId: string | null;
      // The composer's "+" tool badge, as the SESSION now stands after this
      // turn (2026-09-14) — route.ts's own "session's active tool" rule
      // (see its comment there) already carries the tool across turns and
      // drops it the moment an unrelated request starts, but only ever
      // server-side: the composer clears its local badge the instant a
      // message is sent (see activeTool's own comment in SearchHome.tsx)
      // and had nothing to re-set it from, so the badge stayed off from the
      // buyer's second message onward regardless of what the server was
      // still doing underneath. The client re-syncs its badge from this
      // field on every final event, so a still-in-play tool visibly stays
      // attached and a dropped one visibly disappears, instead of the
      // badge and the server's own session state silently disagreeing. Null
      // whenever no tool is in play — never omitted, matching
      // sessionToolAtTurnEnd's own always-explicit contract server-side.
      activeTool: ComposerTool | null;
      // Who the SERVER actually charged this turn to, injected once by
      // sendFinal (2026-09-20) — same pattern as knownBudgetNaira/activeTool
      // above, never set per call site. Exists so the client can catch its
      // own identity going stale: `runSearchStream`'s `isGuest` flag comes
      // from the buyer/vendor store in memory, which nothing re-validates
      // once a session cookie has actually expired — a signed-in buyer whose
      // token died mid-tab still looks signed-in client-side, skips the
      // guest credit gate entirely, and lands here with the server having
      // resolved neither cookie and quietly served (and never charged) the
      // turn as a guest. Comparing this field against the caller's own
      // `isGuest` is what lets searchStream.ts notice that mismatch and
      // correct it, instead of the buyer silently getting unlimited free
      // turns for as long as the tab stays open.
      actorType: "guest" | "buyer" | "vendor";
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
      recommendation: AnyRecommendation | null;
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
  instagramLeads: InstagramLead[];
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
  awaitingVendorSearchOffer: boolean;
  vendorSearchMatchQuery: string | null;
  contextNote: string | null;
  recommendation: AnyRecommendation | null;
  externalOffers: ExternalOffer[];
  awaitingComparisonPurchaseReply: boolean;
  comparisonPickItem: string | null;
  // See SearchHistoryTurn's own comment. Optional, unlike its required
  // siblings above — added after most call sites already existed.
  comparisonOptions?: string[] | null;
  // See SearchStreamEvent's own comment on the "final" variant.
  isGuidanceReply: boolean;
  // See SearchStreamEvent's own comment — carried through so a REHYDRATED
  // offer turn can still skip the identity-capture budget step correctly,
  // not just a live one. Rides along inside the backend's Mixed `snapshot`
  // blob for free; no backend schema change needed for this one (contrast
  // askedLocation/askedBudget, which the MODEL-facing history needs as
  // typed duplicate fields — this is client-UI-only, the model never sees
  // it).
  knownBudgetNaira: number | null;
  // See SearchStreamEvent's own comment on the "final" variant.
  shoppingPlan?: ShoppingPlanSnapshot | null;
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
  // Internal only — the account this conversation is attached to, if any
  // (exactly one of the two, never both — same either-identity rule the
  // ai-search backend's own ownershipFilter follows). Present on what the
  // ai-search backend returns; the BFF route strips both (and refuses the
  // whole conversation on a mismatch) before this type's value ever
  // reaches a browser, so treat them as absent on the client side.
  buyerId?: string | null;
  vendorId?: string | null;
}
