// Curated status-line variants for the search stream's "staged reveal" (spec
// §7 — never raw model chain-of-thought, only pre-written progress text).
// Randomly picking among a few same-meaning phrasings per moment keeps the
// UI from repeating the exact same line on every search.

function pick(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

export function understandingRequestPhrase(hasImage: boolean): string {
  return hasImage
    ? pick([
        "Looking at your photo…",
        "Examining your photo…",
        "Taking a look at the image…",
        "Studying your photo…",
      ])
    : pick([
        "Understanding your request…",
        "Reading what you need…",
        "Making sense of your request…",
        "Got it — thinking it through…",
      ]);
}

// `location` is undefined when there's no location signal at all (device
// permission denied/unavailable AND the buyer named no place) — the search
// runs nationwide instead, so the status line shouldn't claim proximity.
export function searchingPhrase(what: string, location?: string): string {
  if (!location) {
    return pick([
      `Searching for "${what}" across Velte…`,
      `Looking for "${what}" nationwide…`,
      `Checking all of Velte for "${what}"…`,
    ]);
  }
  return pick([
    `Searching for "${what}" near ${location}…`,
    `Looking for "${what}" near ${location}…`,
    `Checking what's near ${location} for "${what}"…`,
    `Scanning nearby listings for "${what}"…`,
  ]);
}

export function foundCountPhrase(
  count: number,
  noun: "product" | "vendor",
  // `null` shouldn't occur when count > 0 in practice, but is accepted here
  // so callers can pass a MatchTier straight through without an unsafe cast
  // — it's treated the same as "local" (the default phrasing below).
  matchTier: "local" | "nearby" | "state" | "nationwide" | null,
): string {
  const plural = count === 1 ? noun : `${noun}s`;
  if (matchTier === "nationwide") {
    return pick([
      `${count} ${plural} found across Velte — ranking by relevance…`,
      `${count} ${plural} turned up nationwide — ranking…`,
    ]);
  }
  if (matchTier === "state") {
    return pick([
      `${count} ${plural} found elsewhere in the state — ranking…`,
      `Nothing that close, but found ${count} ${plural} in the state…`,
      `${count} ${plural} turned up further out — ranking…`,
    ]);
  }
  if (matchTier === "nearby") {
    return pick([
      `${count} ${plural} found a bit further out — ranking…`,
      `Nothing right nearby, but found ${count} ${plural} in the area…`,
      `${count} ${plural} turned up nearby — ranking…`,
    ]);
  }
  return pick([
    `${count} ${plural} found — ranking the closest…`,
    `Found ${count} ${plural} nearby — ranking…`,
    `${count} ${plural} turned up close by…`,
  ]);
}

// Only used for image-derived product searches — narrates the
// direct-vs-similar tiering searchProducts applies when isImageQuery.
export function directMatchPhrase(count: number): string {
  const plural = count === 1 ? "match" : "matches";
  return pick([
    `Found an exact ${plural} for your photo!`,
    `That's a direct ${plural} — here it is.`,
    `Exact ${plural} found for what's in your photo!`,
  ]);
}

export function similarMatchPhrase(count: number): string {
  const plural = count === 1 ? "item" : "items";
  return pick([
    `No exact match, but found ${count} similar ${plural} nearby…`,
    `Nothing identical, but ${count} similar ${plural} turned up…`,
    `Couldn't find that exact one — here are ${count} similar ${plural}…`,
  ]);
}

export function noProductMatchPhrase(): string {
  return pick([
    "No listings matched yet.",
    "Nothing matched this search yet.",
    "Couldn't find a match yet.",
  ]);
}

export function noVendorMatchPhrase(hasExternal: boolean): string {
  return hasExternal
    ? pick([
        "No Velte vendor yet — checking nearby businesses…",
        "Nothing on Velte yet — checking what's nearby…",
        "No match on Velte — looking at nearby options…",
      ])
    : pick([
        "No vendors matched yet.",
        "Nothing matched this search yet.",
        "Couldn't find a vendor match yet.",
      ]);
}
