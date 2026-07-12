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
        "No vendors matched yet.",
        "Nothing matched this search yet.",
        "Couldn't find a vendor match yet.",
        "No vendors turned up yet.",
        "Nothing found for this yet.",
        "Still no vendor match for this one.",
        "No vendors turned up for this yet.",
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
  ];
}
