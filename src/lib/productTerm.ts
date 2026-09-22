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
 *
 * CONDITION ATTRIBUTES ARE PREPENDED, NOT APPENDED (found live: a buyer who
 * answered the bare-query gate's own "new or used?" question with "new" got
 * back a dead-end quoting their search as `"phone new"` — grammatically
 * backwards, and it reads like a mangled quote of something they never
 * actually said). English (and Nigerian English/pidgin the same way) puts a
 * condition adjective before the noun — "new phone", "fairly used laptop" —
 * where every other attribute kind here (color, brand, spec) reads fine
 * trailing after it ("phone black" is odd; "phone new" is actively wrong).
 * Matched on the WHOLE attribute, same granularity searchProductsTool's own
 * schema asks the model for ("condition" as one short, standalone entry),
 * not a substring — this must never misfire on an attribute that merely
 * contains one of these words as part of something else.
 */
const CONDITION_ATTRIBUTE =
  /^(brand[- ]new|new|fairly used|foreign used|uk[- ]used|tokunbo|second[- ]?hand|pre[- ]?owned|refurbished|used)$/i;

// A code-level guard against a budget/price clause landing in `product` or
// an `attributes` entry — searchProductsTool.ts's own schema already tells
// the model this belongs ONLY in its dedicated `maxBudgetNaira` field, never
// here, but a prompt is a request, not a guarantee. Found live, 2026-09-22:
// despite that instruction, "birthday cake 100000 naira budget" still
// reached this function's own join and became the literal search term shown
// to a buyer ("No vendor on Velte has...") AND sent to an external
// connector as a real query — the exact "prose riding along in the query
// text" this whole budget-as-a-filter design was built to prevent
// (searchProductsTool.ts's own maxBudgetNaira comment). Fixed HERE, in the
// one shared join every caller (route.ts, searchProductsTool.ts,
// resolveSearchItem.ts, SearchHome.tsx) already goes through, rather than
// trusting each call site to sanitize its own input — same "one
// implementation, not a per-site exemption to remember" reasoning this
// codebase already applies elsewhere.
//
// Matches a currency amount (a number, optionally with "k"/"thousand"/
// "million"/"naira"/"ngn"/a "₦" sign) combined with "budget", "under",
// "below", "less than", "max(imum)" — deliberately requires BOTH a number
// AND one of those words together, never either alone: a bare number is
// often real product content ("iPhone 15", "50i"), and the bare word
// "budget" on its own is a real, common product descriptor ("budget
// smartphone" means "affordable", not a stated price) that must never be
// stripped just because it happens to also be the word used for a genuine
// budget clause elsewhere.
const BUDGET_PHRASE =
  /\b(?:under|below|less than|not more than|max(?:imum)?)\s*(?:₦\s?)?\d[\d,]*\s*(?:k\b|thousand\b|million\b)?(?:\s*naira\b|\s*ngn\b)?|\b(?:₦\s?\d[\d,]*|\d[\d,]*\s*(?:k\b|thousand\b|million\b)?\s*(?:naira|ngn))\s*budget\b|\bbudget\s*(?:of|is|:)?\s*(?:₦\s?)?\d[\d,]*\s*(?:k\b|thousand\b|million\b)?(?:\s*naira\b)?/gi;

function stripBudgetPhrase(text: string): string {
  return text.replace(BUDGET_PHRASE, " ").replace(/\s+/g, " ").trim();
}

// Same class of bug as BUDGET_PHRASE above, found live 2026-09-22:
// searchStoresTool's own schema already tells the model a booking-length
// detail ("for a day", "for 2 hours") belongs in `attributes`, as its own
// standalone entry — same rule the schema already states for attributes in
// general — never glued into `businessType` itself. The model did it
// anyway: `businessType: "DJ services one day"` reached the actual search
// query AND the buyer-facing dead-end text verbatim ("No one on Velte sells
// DJ services one day"), the exact "prose riding along in the query text"
// shape the budget guard above already exists to catch — a prompt is a
// request, not a guarantee, same lesson, different field. `businessType`
// has no separate "attributes" to join it against (unlike `product`, whose
// join already runs through buildProductTerm below) — it should just never
// carry this kind of clause at all, so this strips rather than relocates.
//
// Matches BOTH "for a day"/"for 2 hours" (with the connector) AND a bare
// "one day"/"2 hours" (no connector at all — the exact shape found live,
// nothing between "services" and "one day"). Deliberately also strips a
// bare "<number> hour(s)" even as a business's own selling point ("24 hour
// locksmith") — an occasional lost descriptor is a smaller cost than a
// garbled search term and a buyer-facing sentence quoting it back.
const DURATION_PHRASE =
  /\bfor\s+(?:the\s+)?(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)?\s*(?:half|full|whole)?[- ]?(?:day|days|hour|hours|week|weeks|month|months|night|nights|evening|evenings|weekend|weekends)\b|\b(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:days?|hours?|weeks?|months?|nights?|evenings?)\b|\b(?:half|full|whole)[- ]day\b|\bovernight\b/gi;

function stripDurationPhrase(text: string): string {
  return text.replace(DURATION_PHRASE, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cleans a raw `businessType` (searchStoresTool's own field) of a
 * budget/duration clause the model glued in despite its schema saying
 * these belong elsewhere — same "code-level guard, not just a prompt"
 * reasoning as buildProductTerm's own stripBudgetPhrase, applied to the
 * ONE field that has no attributes array to fall back on. Returns the
 * original string, never empty, if stripping would leave nothing — a
 * businessType with no real content left is a separate problem
 * (isVagueReference already exists for that), not this function's job.
 */
// Both guards chained together — a duration clause is just as much "real
// information that belongs in a dedicated field, not glued into the search
// term" as a budget clause is (see BUDGET_PHRASE's own comment), and found
// living in the SAME field: "DJ services wedding for a day any music"
// reached a buyer-facing dead-end line with the duration clause intact
// because buildProductTerm below used to strip budget only. One shared
// name so `product`/`attributes` (this function) and `businessType`
// (cleanBusinessType) can never drift into stripping a different set of
// clauses from each other again.
function stripQueryNoise(text: string): string {
  return stripDurationPhrase(stripBudgetPhrase(text));
}

export function cleanBusinessType(businessType: string): string {
  const cleaned = stripQueryNoise(businessType);
  return cleaned || businessType;
}

export function buildProductTerm(
  product: string,
  attributes?: string[],
): string {
  const cleanProduct = stripQueryNoise(product) || product;
  const usedStems = new Set(tokenize(cleanProduct));
  const lead: string[] = [];
  const trail: string[] = [];
  for (const rawAttr of attributes ?? []) {
    // Dropped entirely, not partially edited, when stripping leaves nothing
    // — "100000 naira budget"/"for a day" as a whole attribute has no
    // product-identifying content left once the clause is gone, unlike
    // `product` above (where SOME real item name is expected to remain).
    const attr = stripQueryNoise(rawAttr);
    if (!attr) continue;
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
    const phrase = newWords.join(" ");
    (CONDITION_ATTRIBUTE.test(attr.trim()) ? lead : trail).push(phrase);
    for (const word of newWords) {
      tokenize(word).forEach((s) => usedStems.add(s));
    }
  }
  return [...lead, cleanProduct, ...trail].join(" ");
}

// Words that point AT something without naming it — on top of STOPWORDS,
// which already strips connectors that carry no content either way.
const REFERENTIAL_WORDS = new Set([
  "all",
  "both",
  "any",
  "either",
  "whichever",
  "whatever",
  "it",
  "this",
  "that",
  "them",
  "these",
  "those",
  "one",
  "ones",
  "option",
  "options",
  "best",
  "cheapest",
  "top",
  "good",
  "better",
  "check",
  "give",
  "please",
  "can",
  "you",
]);

/**
 * True when a term carries no real product/business noun to search for —
 * "all of them", "the best", "check all of them and give me the best" — as
 * opposed to a genuinely short but real one ("phone", "TV").
 *
 * Found live: "Can you check all of them and give me the best?" (naming
 * nothing concrete, following a turn that had just SUGGESTED several real
 * laptops) reached searchProducts and the external Serper fallback anyway.
 * A term this vague has no real signal for a vector search or a shopping
 * query to match against, so Serper's `site:jiji.ng OR ...` returned
 * whatever ranks best there GENERICALLY — used-car listings, utterly
 * unrelated to the laptops the buyer had just been shown. Checked here,
 * once, so every caller that builds a search term from the model's own
 * `product`/`businessType` field can refuse to run a real lookup on one
 * rather than trusting the model never to call a search tool with nothing
 * concrete to search for.
 *
 * Deliberately permissive in the OTHER direction: a single real noun
 * anywhere in the term ("the best LAPTOP") is enough to pass — this only
 * catches a term that is ENTIRELY filler once stopwords and referential
 * words are stripped, never a real product name that merely happens to be
 * short.
 */
export function isVagueReference(term: string): boolean {
  const words = term
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) => w.length > 0 && !STOPWORDS.has(w) && !REFERENTIAL_WORDS.has(w),
    );
  return words.length === 0;
}
