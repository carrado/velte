// Curated status-line variants for the search stream's "staged reveal" (spec
// §7 — never raw model chain-of-thought, only pre-written progress text).
//
// Every function below returns the FULL pool of same-meaning phrasings for
// that moment, not a single pre-picked string — the actual choice happens
// centrally in route.ts's `push`, via `pickAvoiding`, which excludes
// whatever's already been shown recently in THIS turn. That's what makes a
// repeat rare rather than just "possible but random": a plain per-call
// random pick from a small pool still repeats a noticeable fraction of the
// time (a 4-item pool repeats ~25% of the time back-to-back), so the
// avoidance has to live above the individual phrase pools, not inside them.

/**
 * Picks one option from `options`, preferring one NOT in `recent` — so the
 * same line showing up twice in a row within one turn (understanding →
 * searching → found, or a zero-result cascade into a second tool call) is
 * rare rather than left to chance. Falls back to the full pool only if
 * every option has recently been shown (small pool, long turn) — repeating
 * is better than throwing or returning nothing.
 */
export function pickAvoiding(options: string[], recent: string[]): string {
  if (options.length <= 1) return options[0] ?? "";
  const fresh = options.filter((o) => !recent.includes(o));
  const pool = fresh.length ? fresh : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Quotes back a piece of what the buyer actually typed — not their full
// message verbatim if it's long, just enough to make the status line read
// as "about THIS request" rather than an identical generic line on every
// search. Plain truncation, not a summary — nothing here is model output.
function snippet(text: string, maxLen = 48): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}

// A bare confirmation/acknowledgement reply — "yes", "sure", "ok" — reads as
// nonsense once dropped into one of the query-quoting templates below
// ("Digging into 'yes'…", found live on a buyer's follow-up turn). This is
// deliberately an exact-match list, not a "short text" heuristic — a real
// short query ("red heels", "iphone charger") is just as short as these but
// reads perfectly fine quoted, so length/word-count alone would misfire on
// completely normal queries.
const ACKNOWLEDGEMENT_REPLIES = new Set([
  "yes",
  "yeah",
  "yep",
  "yup",
  "sure",
  "ok",
  "okay",
  "no",
  "nope",
  "nah",
  "please",
  "please do",
  "thanks",
  "thank you",
  "alright",
  "fine",
  "cool",
  "go ahead",
  "sounds good",
  "that works",
  "perfect",
  "great",
  // The literal, hardcoded button text for the buyerRequestOffered Yes/No
  // pair (see SearchHome.tsx's ConversationTurnView) — a buyer never types
  // these themselves, clicking the button sends this exact string. Added
  // specifically so route.ts's dual-intent guard (isAcknowledgementReply)
  // can tell "answering an existing offer" apart from "naming two new
  // things" — found live: without this, "Yes, find someone" wasn't
  // recognized as an acknowledgement at all (not an exact match against
  // the bare "yes"/"go ahead" entries above), so nothing distinguished it
  // from a fresh request.
  "yes, find someone",
  "no thanks, that's okay",
]);

export function isAcknowledgementReply(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  return ACKNOWLEDGEMENT_REPLIES.has(normalized);
}

// Narrower than isAcknowledgementReply above (which deliberately mixes
// agreement AND decline together — it only ever needed to know "is this a
// bare acknowledgement at all," for quote-suppression purposes) — these two
// specifically distinguish which direction, for route.ts's own deterministic
// "the buyer just agreed to a prior reach-out offer" short-circuit (see
// systemPrompt.ts's buildAgreementOnlySystemPrompt). Exact-match against
// the same canned button strings and the common short replies, same
// normalization as isAcknowledgementReply.
const OFFER_AGREEMENT_REPLIES = new Set([
  "yes",
  "yeah",
  "yep",
  "yup",
  "sure",
  "ok",
  "okay",
  "please",
  "please do",
  "alright",
  "fine",
  "cool",
  "go ahead",
  "sounds good",
  "that works",
  "perfect",
  "great",
  "yes, find someone",
  "yes please",
]);
const OFFER_DECLINE_REPLIES = new Set([
  "no",
  "nope",
  "nah",
  "no thanks",
  "not interested",
  "never mind",
  "no thanks, that's okay",
]);

function normalizeReply(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
}

export function isOfferAgreementReply(text: string): boolean {
  return OFFER_AGREEMENT_REPLIES.has(normalizeReply(text));
}

export function isOfferDeclineReply(text: string): boolean {
  return OFFER_DECLINE_REPLIES.has(normalizeReply(text));
}

// `text` is the buyer's own raw message (undefined for a bare photo with no
// caption) — quoting it back is what keeps this line from reading as the
// same canned "Understanding your request…" on every single search.
export function understandingRequestPhrase(
  hasImage: boolean,
  text?: string,
): string[] {
  const q = text?.trim();

  if (hasImage && q) {
    return [
      `Looking at your photo and "${snippet(q)}"…`,
      `Taking in the photo, plus "${snippet(q)}"…`,
      `Studying your photo alongside "${snippet(q)}"…`,
      `Matching your photo with "${snippet(q)}"…`,
      `Cross-checking your photo against "${snippet(q)}"…`,
      `Pairing the photo with "${snippet(q)}"…`,
      `Looking at the photo and reading "${snippet(q)}"…`,
      `Lining up your photo with "${snippet(q)}"…`,
      `Comparing the photo to "${snippet(q)}"…`,
      `Weighing the photo against "${snippet(q)}"…`,
      `Taking both the photo and "${snippet(q)}" into account…`,
      `Putting the photo together with "${snippet(q)}"…`,
      `Reading your photo and "${snippet(q)}" together…`,
      `Making sense of the photo and "${snippet(q)}"…`,
    ];
  }
  if (hasImage) {
    return [
      "Looking at your photo…",
      "Examining your photo…",
      "Taking a look at the image…",
      "Studying your photo…",
      "Reading the details in your photo…",
      "Getting a good look at what you sent…",
      "Working out what's in the photo…",
      "Taking a closer look…",
      "Zooming in on the details…",
      "Checking out your photo…",
      "Making out what's in the picture…",
      "Giving your photo a proper look…",
      "Picking out the details in your photo…",
      "Sizing up what you sent…",
      "Having a good look at this…",
      "One sec, studying the photo…",
    ];
  }
  if (q && isAcknowledgementReply(q)) {
    return [
      "Got it — following up on that…",
      "Continuing from there…",
      "Alright, picking up where we left off…",
      "On it — working from your last answer…",
      "Got it, taking that into account…",
      "Noted — refining the search now…",
      "Alright, adjusting based on that…",
      "Got it — let's continue…",
    ];
  }
  if (q) {
    return [
      `Looking into "${snippet(q)}"…`,
      `On it — checking "${snippet(q)}"…`,
      `Let's find "${snippet(q)}" for you…`,
      `Reading through "${snippet(q)}"…`,
      `Got it — "${snippet(q)}", one moment…`,
      `Digging into "${snippet(q)}"…`,
      `Working on "${snippet(q)}"…`,
      `Taking a look at "${snippet(q)}"…`,
      `Alright, "${snippet(q)}" — let's see…`,
      `Noted — "${snippet(q)}", give me a moment…`,
      `On the case — "${snippet(q)}"…`,
      `Let me look into "${snippet(q)}"…`,
      `Right, "${snippet(q)}" — one sec…`,
      `Getting to grips with "${snippet(q)}"…`,
      `Making sense of "${snippet(q)}"…`,
      `Sure — looking up "${snippet(q)}"…`,
      `Unpacking "${snippet(q)}"…`,
      `Give me a moment with "${snippet(q)}"…`,
      `Following up on "${snippet(q)}"…`,
      `Taking note of "${snippet(q)}"…`,
    ];
  }
  return [
    "Understanding your request…",
    "Reading what you need…",
    "Making sense of your request…",
    "Got it — thinking it through…",
    "Working out what you're after…",
    "One moment, taking this in…",
    "Looking at what you sent…",
    "Give me a second with this…",
    "Piecing this together…",
    "On it…",
    "Checking whether you're looking for a product or a business…",
    "Checking if your image or message contains what I need…",
    "Preparing the right search…",
    "Identifying what you need…",
    "Looking through what you sent…",
  ];
}

// `location` is undefined when there's no location signal at all (device
// permission denied/unavailable AND the buyer named no place) — the search
// runs nationwide instead, so the status line shouldn't claim proximity.
export function searchingPhrase(what: string, location?: string): string[] {
  if (!location) {
    return [
      `Searching for "${what}" across Velte…`,
      `Looking for "${what}" nationwide…`,
      `Checking all of Velte for "${what}"…`,
      `Casting a wide net for "${what}"…`,
      `Scanning the whole catalog for "${what}"…`,
      `Going nationwide for "${what}"…`,
      `Checking every vendor for "${what}"…`,
      `Searching the whole network for "${what}"…`,
      `Looking everywhere on Velte for "${what}"…`,
      `Sweeping the catalog for "${what}"…`,
      `Checking who has "${what}" nationwide…`,
      `Widening the search for "${what}"…`,
      `Going through the listings for "${what}"…`,
      `Combing the network for "${what}"…`,
      `Searching for "${what}" across Nigeria…`,
      `Searching for businesses that have "${what}"…`,
      `Finding "${what}" that matches…`,
    ];
  }
  return [
    `Searching for "${what}" near ${location}…`,
    `Looking for "${what}" near ${location}…`,
    `Checking what's near ${location} for "${what}"…`,
    `Scanning nearby listings for "${what}"…`,
    `Combing ${location} for "${what}"…`,
    `Checking who's got "${what}" around ${location}…`,
    `Seeing what's close to ${location} for "${what}"…`,
    `Looking around ${location} for "${what}"…`,
    `Checking vendors near ${location} for "${what}"…`,
    `Searching ${location} for "${what}"…`,
    `Scanning around ${location} for "${what}"…`,
    `Checking what's nearby for "${what}"…`,
    `Looking at vendors close to ${location}…`,
    `Seeing who's selling "${what}" near ${location}…`,
    `Checking the area around ${location} for "${what}"…`,
    `On the lookout near ${location} for "${what}"…`,
    `Checking local listings near ${location} for "${what}"…`,
    `Finding "${what}" that matches near ${location}…`,
  ];
}

export function foundCountPhrase(
  count: number,
  noun: "product" | "vendor",
  // `null` shouldn't occur when count > 0 in practice, but is accepted here
  // so callers can pass a MatchTier straight through without an unsafe cast
  // — it's treated the same as "local" (the default phrasing below).
  matchTier: "local" | "nearby" | "state" | "nationwide" | null,
): string[] {
  const plural = count === 1 ? noun : `${noun}s`;
  if (matchTier === "nationwide") {
    return [
      `${count} ${plural} found across Velte — ranking by relevance…`,
      `${count} ${plural} turned up nationwide — ranking…`,
      `Nothing that close, but ${count} ${plural} turned up elsewhere in Nigeria…`,
      `${count} ${plural} found further afield — ranking by relevance…`,
      `${count} ${plural} showed up around the country — ranking…`,
      `Nothing nearby, but ${count} ${plural} turned up elsewhere…`,
      `${count} ${plural} found nationwide — sorting by relevance…`,
      `Found ${count} ${plural} further out — ranking now…`,
      `${count} ${plural} turned up outside your area — ranking…`,
      `Not close by, but ${count} ${plural} found across Nigeria…`,
      `Expanded the search — found ${count} ${plural}…`,
      `Searched nationwide — found ${count} ${plural}…`,
    ];
  }
  if (matchTier === "state") {
    return [
      `${count} ${plural} found elsewhere in the state — ranking…`,
      `Nothing that close, but found ${count} ${plural} in the state…`,
      `${count} ${plural} turned up further out — ranking…`,
      `${count} ${plural} found across the state — ranking…`,
      `${count} ${plural} showed up elsewhere in the state…`,
      `Not right nearby, but ${count} ${plural} in the state turned up…`,
      `${count} ${plural} found further within the state — ranking…`,
      `Found ${count} ${plural} across the state — sorting now…`,
      `${count} ${plural} turned up state-wide — ranking…`,
      `${count} ${plural} found a bit further within the state…`,
      `Found ${count} ${plural} within the state…`,
    ];
  }
  if (matchTier === "nearby") {
    return [
      `${count} ${plural} found a bit further out — ranking…`,
      `Nothing right nearby, but found ${count} ${plural} in the area…`,
      `${count} ${plural} turned up nearby — ranking…`,
      `${count} ${plural} found a little further afield — ranking…`,
      `${count} ${plural} showed up in the area — ranking…`,
      `Found ${count} ${plural} close to the area — ranking…`,
      `${count} ${plural} turned up a short distance away…`,
      `${count} ${plural} found not too far off — ranking…`,
      `Not right there, but ${count} ${plural} nearby turned up…`,
      `${count} ${plural} found in the surrounding area…`,
    ];
  }
  return [
    `${count} ${plural} found — ranking the closest…`,
    `Found ${count} ${plural} nearby — ranking…`,
    `${count} ${plural} turned up close by…`,
    `Good news — ${count} ${plural} right around you…`,
    `${count} ${plural} found nearby — sorting by distance…`,
    `${count} ${plural} showed up close to you — ranking…`,
    `Found ${count} ${plural} right in your area…`,
    `${count} ${plural} turned up nearby — sorting now…`,
    `Good news — ${count} ${plural} found close by…`,
    `${count} ${plural} found right around you — ranking…`,
    `Nice — ${count} ${plural} turned up nearby…`,
    `${count} ${plural} found close to you — sorting…`,
    `Found ${count} ${plural}.`,
    `Here are the ${count} closest ${plural} found.`,
  ];
}

// Only used for image-derived product searches — narrates the
// direct-vs-similar tiering searchProducts applies when isImageQuery.
export function directMatchPhrase(count: number): string[] {
  const plural = count === 1 ? "match" : "matches";
  return [
    `Found an exact ${plural} for your photo!`,
    `That's a direct ${plural} — here it is.`,
    `Exact ${plural} found for what's in your photo!`,
    `Spotted an exact ${plural} from your photo!`,
    `That's it — an exact ${plural} for your photo!`,
    `Nailed it — exact ${plural} found!`,
    `Found exactly what's in your photo!`,
    `Here it is — an exact ${plural}!`,
    `Great news — exact ${plural} found for your photo!`,
    `Spot on — an exact ${plural} turned up!`,
    `Found an exact ${plural}!`,
  ];
}

export function similarMatchPhrase(count: number): string[] {
  const plural = count === 1 ? "item" : "items";
  return [
    `No exact match, but found ${count} similar ${plural} nearby…`,
    `Nothing identical, but ${count} similar ${plural} turned up…`,
    `Couldn't find that exact one — here are ${count} similar ${plural}…`,
    `Not an exact match, but ${count} close ${plural} showed up…`,
    `No exact hit, but ${count} similar ${plural} turned up nearby…`,
    `Couldn't match it exactly — ${count} similar ${plural} found instead…`,
    `Nothing exact, but ${count} close-looking ${plural} showed up…`,
    `No perfect match, but ${count} similar ${plural} nearby…`,
    `That exact one's not around, but ${count} similar ${plural} are…`,
    `Not quite identical, but ${count} similar ${plural} turned up…`,
    `Found something very similar — ${count} ${plural} to check out…`,
  ];
}

// No `hasExternal` branch here on purpose: a zero-result searchProducts
// ALWAYS falls through to a searchStores call next (see systemPrompt.ts's
// zero-result rule) — a real, still-on-Velte vendor can easily turn up there
// even when nothing was listed as a product. Claiming "checking nearby
// businesses" (i.e. leaving Velte) at this point is simply wrong — that
// phrasing belongs to noVendorMatchPhrase, once the store-level check has
// ALSO come back empty and the flow is genuinely about to go external.
export function noProductMatchPhrase(): string[] {
  return [
    "No listing yet — checking other Velte vendors…",
    "Not listed as a product — checking other vendors on Velte…",
    "Nothing under that exact item — checking other vendors…",
    "No product match yet — checking who else might carry it…",
    "Not found as a listing — widening to other Velte vendors…",
    "No exact listing yet — checking other vendors who might have it…",
    "Nothing matched as a product — checking vendors who sell this kind of thing…",
    "No listing for that yet — checking other vendors nearby…",
    "Not listed yet, but checking other Velte vendors…",
    "No match on that listing — checking other vendors on Velte…",
    "No exact product found — looking for stores instead…",
    "Couldn't find a listing — searching for vendors instead…",
  ];
}

export function noVendorMatchPhrase(hasExternal: boolean): string[] {
  return hasExternal
    ? [
        "No Velte vendor yet — checking nearby businesses…",
        "Nothing on Velte yet — checking what's nearby…",
        "No match on Velte — looking at nearby options…",
        "Not on Velte yet — seeing what else is around…",
        "No vendor on Velte yet — checking other options nearby…",
        "Nothing listed yet — looking at what's close by…",
        "Not finding a vendor on Velte — checking around you…",
        "No Velte match yet — widening the search a bit…",
        "Couldn't find a vendor on Velte — checking nearby…",
        "Nothing yet on Velte — seeing what's around instead…",
      ]
    : [
        // hasExternal is false here specifically because the nearby-business
        // fallback ALSO came back empty (see searchStoresTool.ts's call
        // site) — spelling that out (not just "no vendors matched") is what
        // makes this read as a complete, honest answer instead of a vague
        // half-finished one.
        "No Velte vendor for this yet, and nothing else nearby either.",
        "Nothing on Velte for this, and no nearby alternatives came up.",
        "Couldn't find a Velte vendor or anything nearby for this.",
        "No match on Velte, and no other options turned up nearby.",
        "Nothing found on Velte, and no nearby businesses came up either.",
        "No Velte vendor yet — and no nearby alternative either.",
        "Nothing matched on Velte or nearby for this search.",
        // Adapted from a vaguer submitted phrase ("No results came up this
        // time.") to keep this bucket's own established convention — see
        // this branch's comment above on why spelling out BOTH "no Velte"
        // and "no nearby" matters here specifically.
        "No results this time — nothing on Velte, and nothing nearby either.",
        "Not available right now — no Velte match, and nothing nearby either.",
      ];
}

// Sole status line for createBuyerRequestTool's "created" path — the
// "needs_identity" path shows no status line at all (the frontend takes
// over with the inline phone+OTP capture instead of a spinner).
export function sendingRequestPhrase(): string[] {
  return [
    "Sending your request to businesses that may be able to help…",
    "Reaching out to businesses on Velte…",
    "Passing your request along to relevant businesses…",
    "Getting this in front of businesses who might have it…",
    "Sending this out to businesses on Velte now…",
  ];
}

// Client-side only, unlike every other function in this file — rotated by
// ClarificationPrompt.tsx (via pickAvoiding, also exported above) while the
// browser's own getCurrentPosition() call is in flight, so the "share my
// location" button reads as actively working rather than frozen for
// however many seconds that takes. Grouped here anyway rather than in a
// separate module: same rotating-phrase voice/mechanism as everything else
// in this file, just triggered by the browser's geolocation API instead of
// a search tool call — nothing in this file needs a server-only capability,
// so importing it into a "use client" component is safe.
export function gettingLocationPhrase(): string[] {
  return [
    "Getting your location…",
    "Finding out where you are…",
    "Pinpointing your location…",
    "Working out where you are…",
    "Locating you now…",
    "Checking your device's location…",
    "One moment, getting your location…",
    "Figuring out where you are…",
    "Getting your coordinates…",
    "Zeroing in on your location…",
    "Just a moment — locating you…",
  ];
}

// Also client-side only, same reasoning as gettingLocationPhrase above —
// SearchHome.tsx's own phone/OTP identity-capture flow (2026-08-19
// redesign: the buyer types their number/code straight into the composer,
// same as any other message, instead of a separate inline form widget)
// rotates these via pickAvoiding while its own REST calls
// (request-otp/verify-otp/POST buyer-requests) are in flight, so each
// step reads as Velte actively working, same shimmering-status language
// as every other in-progress moment in this app.
export function sendingOtpPhrase(): string[] {
  return [
    "Sending your verification code…",
    "Texting you a code now…",
    "Getting a code sent to your number…",
    "One moment — sending your code…",
    "Sending that code your way…",
  ];
}

export function checkingOtpPhrase(): string[] {
  return [
    "Checking your code…",
    "Verifying that code…",
    "Confirming your code…",
    "One moment — checking that…",
    "Making sure that code matches…",
  ];
}

export function creatingRequestPhrase(): string[] {
  return [
    "Creating your request…",
    "Sending this out to businesses now…",
    "Putting your request together…",
    "Almost there — sending this out…",
    "Getting this in front of businesses now…",
  ];
}

// The unified "genuine Velte dead end" reveal (see route.ts's own comment
// on the block that uses these) — three stages, each with its own voice:
// an immediate closing-the-loop BUBBLE on the search that just ran, a
// STATUS line narrating a second, wider vendor scan (by sector/store
// description, not by listing) now starting, then a final bubble reporting
// what that scan decided. All three are code-authored on purpose, same
// reliability reasoning as noMatchRequestPhrase below — this used to be the
// model's own job (write the offer, decide the wording) and drifted in
// practice (sometimes skipping the offer, sometimes narrating Google Places
// before it should); a plain phrase pool can't drift.

// `what` is the product/businessType term actually searched — same
// snippet() truncation as understandingRequestPhrase/searchingPhrase above,
// so a long buyer message doesn't blow out the bubble.
export function notFoundDirectlyPhrase(what: string): string[] {
  const w = snippet(what, 60);
  return [
    `Couldn't find "${w}" listed directly on Velte.`,
    `No direct listing for "${w}" on Velte just yet.`,
    `Nothing under "${w}" as an actual listing on Velte.`,
    `"${w}" isn't listed directly on Velte right now.`,
    `Came up empty for "${w}" as a direct listing.`,
    `No exact listing for "${w}" on Velte at the moment.`,
  ];
}

export function scanningVendorsPhrase(what: string): string[] {
  const w = snippet(what, 60);
  return [
    `Widening the search — checking vendors whose sector fits "${w}"…`,
    `Scanning businesses that might be able to help with "${w}"…`,
    `Checking vendor profiles for anyone related to "${w}"…`,
    `Looking a bit further — vendors whose store fits "${w}"…`,
    `Casting a wider net for businesses that handle "${w}"…`,
    `Checking who else might be able to help with "${w}"…`,
    `One more look — scanning for vendors related to "${w}"…`,
  ];
}

export function foundPossibleVendorPhrase(what: string): string[] {
  const w = snippet(what, 60);
  return [
    `No direct listing, but I found a business whose sector fits "${w}" — want me to reach out to them on your behalf?`,
    `Nothing listed exactly, but a vendor nearby looks like a fit for "${w}" — want me to check with them?`,
    `Found a business that might handle "${w}", even without a direct listing — should I reach out for you?`,
    `Not listed directly, but there's a vendor whose store fits "${w}" — want me to get in touch with them?`,
    `A real business turned up that might carry "${w}" — want me to reach out and ask?`,
  ];
}

// `what` names the actual term that was searched — found live: this pool
// used to say only "this"/"this one", which reads fine on the very turn it
// was searched for but goes vague the moment it's the buyer's SECOND thing
// this session (a dual-intent item B, or any later turn) — nothing in the
// sentence itself says what came up empty. Same snippet() truncation as
// every other buyer-facing term in this file.
export function noVendorEvenBySectorPhrase(
  what: string,
  hasNearby: boolean,
): string[] {
  const w = snippet(what, 60);
  return hasNearby
    ? [
        `No vendor on Velte fits "${w}", even by sector — but here's what's actually nearby.`,
        `Nothing on Velte matches "${w}", even broadly — here's what turned up close by though.`,
        `Couldn't find a Velte vendor for "${w}" at all — a few real options nearby did turn up.`,
        `No match on Velte for "${w}", even a loose one — here's what's around you instead.`,
      ]
    : [
        `Nothing on Velte fits "${w}", even by sector, and nothing nearby either.`,
        `No vendor on Velte for "${w}", and no nearby alternative came up either.`,
        `Couldn't find a match on Velte or anything nearby for "${w}".`,
        `No results here for "${w}" — nothing on Velte, and nothing close by either.`,
      ];
}

// BuyerRequestOfferWidget's own "no vendor to notify" message (see that
// file's comment) — a FINAL statement after actually trying, not an
// in-progress status line like the pool above it, so it gets its own voice:
// past tense, closing a loop rather than narrating one. `hasNearby` mirrors
// noVendorMatchPhrase's own hasExternal split — true once /api/buyer-
// requests/nearby's fallback search turns up real Google Places results to
// show below this text, false when that also came back empty.
export function noMatchRequestPhrase(hasNearby: boolean): string[] {
  return hasNearby
    ? [
        "Couldn't find a Velte vendor to send that to, but here's what's actually nearby.",
        "No Velte vendor for this one — here's what turned up close by instead.",
        "Nobody on Velte to reach out to for that yet, but a few real options nearby did turn up.",
        "That didn't reach anyone on Velte, but here's what's around you.",
        "No luck finding a Velte vendor for this — here's what's nearby though.",
        "Couldn't get this to a Velte vendor, but found a few nearby options worth a look.",
      ]
    : [
        "Couldn't find any businesses to reach out to for that just now — new vendors join often, so it's worth trying again later.",
        "No vendor was available to send that to this time — worth checking back later as more join Velte.",
        "Nobody matched for that one right now — try again another time, new vendors sign up often.",
        "That didn't reach anyone this time — Velte's vendor list is growing, so it may be worth another try later.",
        "No match to send that to just now — check back later, new businesses join Velte all the time.",
      ];
}

// The dual-intent branch's own two extra moments (route.ts) — a buyer's
// single message named TWO distinct needs (a specific item AND a separate
// kind of business), and per explicit request the buyer should be told
// that's what's happening, not just see one side's results appear with no
// acknowledgement the other was even heard. `itemA`/`itemB` are already
// the plain display labels route.ts derives for each side (the product
// term + attributes joined, and the store/business type), truncated the
// same way every other phrase pool here truncates a buyer-facing term.
//
// Neither phrase commits to an ORDER anymore (2026-08-20, per explicit
// request) — which one starts first is now the buyer's own pick (see
// itemPickQuestionPhrase below), not a fixed "product side always goes
// first" convention, so nothing here can say "starting with X" before the
// buyer has actually chosen.

// A STATUS line (pushed via route.ts's own `push`, same shimmering
// treatment as every other status event) shown the moment the dual-intent
// branch is confirmed — before the pick question itself renders, so the
// buyer sees "two things heard" arrive as a beat of its own, not bundled
// into the question bubble.
export function splittingRequestPhrase(itemA: string, itemB: string): string[] {
  const a = snippet(itemA, 40);
  const b = snippet(itemB, 40);
  return [
    `Looks like two separate things here — "${a}" and "${b}"…`,
    `Two requests in one — "${a}" and "${b}"…`,
    `Splitting this into two: "${a}" and "${b}"…`,
    `Got two needs here — "${a}" and "${b}"…`,
    `Noticed two things in there — "${a}" and "${b}"…`,
  ];
}

// The REPLY-text question itself (this turn's `clarification.question`,
// kind "item_pick" — see Clarification's own comment) — asks the buyer
// which of the two to look into first, rather than assuming. Sits above
// the two pick buttons SearchHome.tsx renders from the SAME clarification
// (see ClarificationPrompt.tsx).
export function itemPickQuestionPhrase(itemA: string, itemB: string): string[] {
  const a = snippet(itemA, 40);
  const b = snippet(itemB, 40);
  return [
    `You mentioned two things — "${a}" and "${b}". Which should I look into first?`,
    `Two things to sort out — "${a}" or "${b}" — which one first?`,
    `Sounds like you need both "${a}" and "${b}". Which should I start with?`,
    `Got it — "${a}" and "${b}". Which one should I tackle first?`,
  ];
}

// The background-item bar's own three states (SearchHome.tsx) — deferred
// item B (or a later chained item), narrated once its OWN turn/fetch
// exists. `justConcluded` is whichever item just finished (item A the first
// time; the item that just resolved, on any later chained hop) and
// `next` is the one about to start — both already plain display labels.

// Shown the instant a deferred item is queued (route.ts's own
// backgroundItems), before it's actually started fetching — covers the
// whole stretch while `justConcluded`'s own flow (including a full
// reach-out-offer exchange, if it has one) is still resolving. Always
// visible unconditionally while this is the bar's state — there's no turn
// of `next`'s own yet to check on-screen-ness against.
export function initiatingBackgroundItemPhrase(
  justConcluded: string,
  next: string,
): string[] {
  const a = snippet(justConcluded, 40);
  const b = snippet(next, 40);
  return [
    `Sorting out "${a}" first — I'll come back for "${b}" right after.`,
    `Working on "${a}" now; "${b}" is queued up next.`,
    `Getting "${a}" settled first, then I'll pick up "${b}".`,
    `Handling "${a}" now — "${b}" is next in line.`,
    `Wrapping up "${a}" — "${b}" starts as soon as that's done.`,
  ];
}

// Shown once the deferred item's own resolution needs the buyer's own
// action (an "offer" — the same reach-out exchange a normal offer gets).
// Only ever rendered while its own turn is off-screen (see
// itemBTurnVisible in SearchHome.tsx) — this is a "you're missing
// something" flag, not a persistent banner.
export function backgroundItemPendingPhrase(label: string): string[] {
  const w = snippet(label, 40);
  return [
    `"${w}" needs a quick reply from you — tap to see it.`,
    `I need your input on "${w}" — tap to answer.`,
    `Waiting on you for "${w}" — tap to reply.`,
    `"${w}" has a question waiting — tap to answer it.`,
  ];
}

// Shown once the deferred item resolved into a terminal result needing no
// action (real Velte results, or a genuine dead end — always backed by a
// cross-check + Google Places, never a silent nothing — see
// resolveSearchItem.ts). Same off-screen-only gating as the pending phrase
// above.
export function backgroundItemResolvedPhrase(label: string): string[] {
  const w = snippet(label, 40);
  return [
    `"${w}" is sorted — tap to see what I found.`,
    `Good news on "${w}" — tap to take a look.`,
    `Done with "${w}" — tap to see the results.`,
    `"${w}" wrapped up — tap to view it.`,
  ];
}

// Sole status line for getVendorProductsTool — a plain lookup by handle
// (see that file), not a ranked search, so there's nothing to report other
// than "working on it."
export function fetchingCatalogPhrase(): string[] {
  return [
    "Checking their catalog…",
    "Pulling up their listings…",
    "Looking at what they sell…",
    "Grabbing their product list…",
    "Taking a look at their store…",
    "Pulling up what they have on offer…",
    "Checking what's in their catalog…",
    "Getting their listings…",
    "One moment, checking their shop…",
    "Looking through what they offer…",
    "Fetching their latest listings…",
    "Loading their catalog…",
    "Retrieving their catalog…",
    "Checking their inventory…",
    "Checking what this vendor offers…",
  ];
}
