// Shared by both server (route.ts, searchProductsTool.ts, resolveSearchItem.ts)
// and client (SearchHome.tsx) code — plain string logic, no server secrets,
// so it lives at the neutral src/lib/ root rather than under src/lib/server/,
// letting every call site that builds a "product + attributes" term import
// the SAME implementation instead of each reimplementing its own join.
//
// Deliberately its own small tokenize/stem pair rather than importing
// route.ts's or sectorClarifiers.ts's own copies — those are server-only
// files (SearchHome.tsx can't import from either), and this repo already
// has precedent for a few independent, self-contained tokenize
// implementations rather than one shared one (see sectorClarifiers.ts's own
// copy) — not ideal, but consistent with how this codebase already is, and
// not worth a wider tokenize-unification refactor just to fix this one bug.

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "of",
  "and",
  "or",
  "to",
  "in",
  "on",
  "with",
  "my",
  "me",
  "i",
  "need",
  "want",
  "looking",
]);

function stem(word: string): string {
  if (word.endsWith("ies") && word.length > 5) return word.slice(0, -3) + "y";
  if (word.endsWith("ing") && word.length > 6) return word.slice(0, -3);
  if (word.endsWith("ers") && word.length > 6) return word.slice(0, -3);
  if (word.endsWith("er") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);
  return word;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/**
 * Joins a `product` + `attributes` pair (searchProductsTool's own input
 * shape, and every place downstream that carries the same shape — a
 * dual-intent item's product side, a buyer-facing search-item label, a
 * cross-check's fallback business type) into one term — deduplicated at
 * the WORD level, not just whole-attribute-vs-product, so a word already
 * said once never gets repeated no matter which field said it first.
 *
 * First found live: a repair query landed `product: "Infinix Hot 50i
 * repair"` and `attributes: ["Infinix Hot 50i phone repair screen"]` in
 * the SAME tool call — an early version of this function only ever
 * compared each WHOLE attribute against the product term and dropped it
 * if most of its words overlapped, which handled that shape. But a second,
 * different-shaped case then got through the same gap: `attributes:
 * ["phone repair", "screen repair", "battery repair"]` — three SHORT
 * attributes, each sharing only "repair" (one word) with the product, so
 * none of them cleared the old whole-attribute overlap threshold on its
 * own, yet the word "repair" still ended up repeated four times in the
 * final joined string ("...repair phone repair screen repair battery
 * repair..."). Whole-attribute comparison can never catch that: the
 * repetition is spread thin across several separately-fine-looking
 * attributes, not concentrated in one obviously-duplicate one.
 *
 * Fixed by tracking used words at the WORD level instead, across product
 * AND every previously-kept attribute together: each attribute contributes
 * only the words it introduces that haven't been said yet ("phone repair"
 * after "Infinix Hot 50i repair" already used "repair" contributes just
 * "phone"; the next attribute's own "repair" is by then already used too,
 * so "screen repair" contributes just "screen"). An attribute contributing
 * nothing new is dropped entirely, same as the original fix's intent — a
 * whole-word restatement is just the case where EVERY word turns out
 * already-used. searchProductsTool's own schema describes attributes as
 * "color, size, brand, material, style, condition, etc." — genuinely
 * separate descriptors — but never explicitly forbids restating the need
 * itself, and trusting prose compliance alone for text that gets rendered
 * VERBATIM to a buyer (or sent as the actual search query) isn't this
 * codebase's pattern anywhere else.
 */
export function buildProductTerm(
  product: string,
  attributes?: string[],
): string {
  const usedStems = new Set(tokenize(product));
  const parts = [product];
  for (const attr of attributes ?? []) {
    const words = attr.split(/\s+/).filter(Boolean);
    const newWords = words.filter((word) => {
      const stems = tokenize(word);
      // A stopword/punctuation-only "word" (tokenize strips it to nothing)
      // carries no real content to dedupe against — always keep it rather
      // than silently swallowing connector words like "for"/"with".
      if (!stems.length) return true;
      return !stems.every((s) => usedStems.has(s));
    });
    if (!newWords.length) continue;
    parts.push(newWords.join(" "));
    for (const word of newWords) {
      tokenize(word).forEach((s) => usedStems.add(s));
    }
  }
  return parts.join(" ");
}
