import { ALL_SECTORS, SECTOR_BY_VALUE } from "@/lib/sectors";
import {
  SERVICE_DETAIL_PRESETS,
  GENERAL_PRODUCT_PRESETS,
  PRODUCT_PRESETS_BY_CATEGORY,
  FOOD_DETAIL_PRESETS,
  getServiceDetailPresets,
  getFoodDetailPresets,
} from "@/lib/attribute-presets";
import type {
  ClarifierField,
  ClarifierMode,
  SectorClarifiers,
  SectorLeaf,
} from "@/types/sectors";
import type { AttributeSchemaOverrides } from "@/types/product";
import type { SearchIntentKind } from "@/types/search";

// Deterministic, in-code sector detection + weighted field selection for the
// interactive search flow (systemPrompt.ts's sector-clarifier note). No LLM
// or embeddings call — Voyage lives entirely behind velte-backend's own
// endpoints, unreachable from this repo without a cross-repo change, and the
// hard rule here only ever needs a best-effort GATE ("is a sector confident
// enough to ask about") where a miss safely falls back to plain search, not
// a wrong guess forced through. Never touches retrieval itself: this only
// ever picks which questions to ask and what to fold into the query text.

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "im",
  "need",
  "want",
  "looking",
  "for",
  "to",
  "buy",
  "get",
  "some",
  "my",
  "me",
  "and",
  "or",
  "with",
  "near",
  "in",
  "of",
  "on",
  "at",
  "is",
  "are",
  "it",
  "this",
  "that",
  "please",
  "can",
  "you",
  "find",
  "help",
  "one",
  "someone",
  "who",
  "will",
]);

// A handful of common buyer words that don't literally appear in the sector
// taxonomy's own labels/values but clearly imply one. Deliberately small and
// hand-picked from the queries this feature actually needs to recognize —
// not an attempt at full synonym coverage. A word missing here just means a
// sector goes undetected, which is the safe default (see detectSector).
const SYNONYMS: Record<string, string[]> = {
  car: ["auto", "automotive", "vehicle"],
  cars: ["auto", "automotive", "vehicle"],
  iphone: ["phones", "electronics", "repairs"],
  phone: ["phones", "electronics", "repairs"],
  phones: ["phones", "electronics", "repairs"],
  laptop: ["computers", "electronics", "repairs"],
  computer: ["computers", "electronics", "repairs"],
  dress: ["fashion", "clothing", "apparel"],
  clothes: ["fashion", "clothing", "apparel"],
  rent: ["real", "estate", "property"],
  apartment: ["real", "estate", "property"],
  house: ["real", "estate", "property"],
  flat: ["real", "estate", "property"],
  haircut: ["hairdressing", "barbing", "beauty"],
  hair: ["hairdressing", "barbing", "beauty"],
  agbada: ["tailoring", "fashion", "design"],
  kaftan: ["tailoring", "fashion", "design"],
  sneaker: ["shoes", "footwear", "fashion"],
  sneakers: ["shoes", "footwear", "fashion"],
  // Words whose sector label uses a genuinely DIFFERENT root, so no amount
  // of suffix stemming can bridge them (unlike "plumber"/"Plumbing" or
  // "photographer"/"Photography", which stemming now handles on its own).
  // This map stays the intended extension point for that gap — add a word
  // here when a real query detects no sector and should have.
  electrician: ["electrical", "installation"],
  // The agent nouns that used to reach their sector through a stem
  // collision (see STEM_COLLISIONS) — declared as the inferred matches
  // they always were.
  engineer: ["engineering", "architecture", "design"],
  painter: ["painting", "decorating"],
  autoparts: ["auto", "parts", "accessories"],
  fridge: ["appliances", "electronics", "home"],
  freezer: ["appliances", "electronics", "home"],
  cake: ["bakery", "pastries", "confectionery"],
  cakes: ["bakery", "pastries", "confectionery"],
  mattress: ["bedding", "linens"],
  lawyer: ["legal", "services"],
  accountant: ["accounting", "bookkeeping"],
  tutor: ["tutorial", "schools", "training"],
  mover: ["logistics", "moving", "haulage"],
  movers: ["logistics", "moving", "haulage"],
  // Food: a buyer names a DISH, the taxonomy names a business type.
  rice: ["restaurants", "food", "quick"],
  jollof: ["restaurants", "food", "quick"],
  soup: ["restaurants", "food", "quick"],
  suya: ["street", "food", "delicacies"],
  shawarma: ["street", "food", "quick"],
  pizza: ["restaurants", "food", "quick"],
  bread: ["bakery", "pastries"],
  snacks: ["confectionery", "snacks"],
  // The ITEM long tail. Sector labels name business types ("Phones &
  // Accessories", "Home Electronics & Appliances"); buyers name objects
  // ("power bank", "blender", "wig"). Nothing in the label vocabulary
  // bridges those, so an ordinary shopping query scored ZERO and the
  // attribute gate went silent — found live on "I need a power bank",
  // which asked nothing and went straight to a dead end. A spot check of
  // 50 everyday items had 40 detecting no sector at all, which is why
  // this list exists AND why getGeneralClarifierFields below is the real
  // safety net: no hand-written list ever finishes covering this.
  powerbank: ["phones", "accessories", "electronics"],
  charger: ["phones", "accessories", "electronics"],
  charg: ["phones", "accessories", "electronics"],
  earbuds: ["phones", "accessories", "electronics"],
  earphone: ["phones", "accessories", "electronics"],
  earphon: ["phones", "accessories", "electronics"],
  headphone: ["phones", "accessories", "electronics"],
  headphon: ["phones", "accessories", "electronics"],
  airpods: ["phones", "accessories", "electronics"],
  airpod: ["phones", "accessories", "electronics"],
  tablet: ["phones", "accessories", "electronics"],
  ipad: ["phones", "accessories", "electronics"],
  smartwatch: ["phones", "accessories", "electronics"],
  memorycard: ["phones", "accessories", "electronics"],
  macbook: ["computers", "laptops", "electronics"],
  // Peripherals are deliberately NOT mapped to Computers & Laptops. That
  // sector's questions are laptop questions — a printer asked for its
  // Processor is the same error as a laptop asked for its 5000mAh battery,
  // one level down — and the taxonomy has no peripherals sector to send
  // them to instead. Detecting nothing routes them to the general pool
  // (Brand / Condition / Color), which is vaguer but true of all of them.
  // Give them a home here the moment the taxonomy grows one.
  ps: ["gaming", "consoles"],
  playstation: ["gaming", "consoles"],
  xbox: ["gaming", "consoles"],
  console: ["gaming", "consoles"],
  tv: ["home", "electronics", "appliances"],
  television: ["home", "electronics", "appliances"],
  televis: ["home", "electronics", "appliances"],
  airconditioner: ["home", "electronics", "appliances"],
  microwave: ["home", "electronics", "appliances"],
  blender: ["kitchenware", "appliances"],
  blend: ["kitchenware", "appliances"],
  cooker: ["kitchenware", "appliances"],
  cctv: ["home", "electronics", "appliances"],
  speaker: ["home", "electronics", "appliances"],
  speak: ["home", "electronics", "appliances"],
  inverter: ["solar", "panel", "electrical"],
  invert: ["solar", "panel", "electrical"],
  sofa: ["furniture"],
  bed: ["furniture", "bedding"],
  curtain: ["decor", "furnishings", "home"],
  rug: ["decor", "furnishings", "home"],
  wig: ["hairdressing", "barbing", "beauty"],
  handbag: ["bags", "accessories"],
  wristwatch: ["jewelry", "watches"],
  ankara: ["textile", "fabric", "clothing"],
  gele: ["textile", "fabric", "clothing"],
  slippers: ["shoes", "footwear", "fashion"],
  slipper: ["shoes", "footwear", "fashion"],
  jersey: ["clothing", "apparel", "fashion"],
  tyre: ["tyre", "vulcanizing", "auto"],
  tyres: ["tyre", "vulcanizing", "auto"],
};

// Multi-word item names that tokenize into words the taxonomy never uses
// ("power bank" -> power, bank). Collapsed to ONE token before tokenizing
// so SYNONYMS above can carry them like any other word. Same extension
// rule as SYNONYMS: add a phrase here when a real query detects nothing
// and should have.
const PHRASE_SYNONYMS: Array<[RegExp, string]> = [
  [/\bpower\s*banks?\b/gi, " powerbank "],
  [/\bflash\s*drives?\b/gi, " flashdrive "],
  [/\bmemory\s*cards?\b/gi, " memorycard "],
  [/\bsmart\s*watch(es)?\b/gi, " smartwatch "],
  [/\bair\s*conditioners?\b/gi, " airconditioner "],
  [/\bplay\s*station\b/gi, " playstation "],
  [/\bps\s*[345]\b/gi, " playstation "],
  [/\bgas\s*cookers?\b/gi, " cooker "],
  [/\bwashing\s*machines?\b/gi, " appliances "],
  // Not groceries, despite `oil` being a staple (see STAPLE_FOODS): the
  // whole phrase is the product, and it belongs to a shop selling car
  // parts.
  [/\b(engine|motor|gear|brake|hydraulic)\s*oils?\b/gi, " autoparts "],
];

// A QUANTITY, not a product. "bag of rice" was read as Bags & Accessories
// the moment literal matches started outweighing inferred ones, because
// "bag" is a literal hit on that sector's own vocabulary — but a measure
// word followed by "of" is never the thing being bought. Dropped from the
// text before tokenizing, which is safe precisely because of the "of": a
// bare "bag", "crate" or "carton" is left alone and still matches normally.
const MEASURE_PHRASE =
  /\b(bags?|sacks?|cartons?|crates?|kegs?|tins?|sachets?|packs?|packets?|bottles?|baskets?|dozens?|tubers?|bunch(?:es)?|paints?|congos?|mudus?|dericas?|rubbers?|cups?|portions?|plates?)\s+of\b/gi;

// The subset that means SHOPPING rather than SERVING. A plate, a portion
// and a cup are how cooked food is ordered, not how a staple is bought, so
// they're stripped from the text like any other measure (above) but must
// never vote for a supermarket — "plate of rice" is a restaurant.
const RETAIL_MEASURE_PHRASE =
  /\b(bags?|sacks?|cartons?|crates?|kegs?|tins?|sachets?|packs?|packets?|bottles?|baskets?|dozens?|tubers?|bunch(?:es)?|paints?|congos?|mudus?|dericas?|rubbers?)\s+of\b/i;

// Nigerian retail quantities, the other half of the same signal: "50kg
// rice", "4 litres of oil", "half bag of garri".
const BULK_QUANTITY =
  /\b(\d+\s?(?:kg|kilos?|litres?|liters?|paint|congo|mudu|derica)s?|half\s+(?:a\s+)?bag|full\s+bag)\b/i;

// Staples a Nigerian buyer buys BY MEASURE from a shop, as opposed to
// ordering cooked on a plate. The distinction this file has to make is
// exactly that one: "jollof rice" is a restaurant, "bag of rice" is a
// supermarket, and the word "rice" alone cannot tell you which. The
// measure is what disambiguates, so both signals are required together —
// see detectGroceryPurchase.
const STAPLE_FOODS =
  /\b(rice|beans|garri|gari|semo|semovita|semolina|yam|yams|oil|flour|sugar|salt|noodles|indomie|spaghetti|macaroni|milk|milo|bournvita|tomatoes?|pepper|onions?|eggs?|crayfish|stockfish|melon|egusi|ogbono|maize|corn|millet|plantain|cassava|fufu|wheat|groundnuts?|honey|butter|cereal|beverages?|provisions?|foodstuffs?)\b/i;

/**
 * "bag of rice" -> Groceries & Supermarket, decided before scoring rather
 * than through it.
 *
 * Scoring cannot reach this on its own: `rice` is a synonym for the
 * restaurant sectors (added for "jollof rice", where it's right), and the
 * groceries sector's entire vocabulary is two words, so the dish reading
 * outscores the shop reading no matter how the weights are tuned. The
 * honest fix is to recognise the SHAPE of the request instead — a staple
 * named together with a retail measure is somebody buying food to cook,
 * never somebody ordering a plate — and both halves are required, so a
 * bare "rice" still reaches the restaurants it should.
 *
 * Skipped for service intent: nobody hires a bag of rice.
 */
function detectGroceryPurchase(
  query: string,
  prefer?: "retail" | "service",
): SectorLeaf | null {
  if (prefer === "service") return null;
  const hasMeasure =
    RETAIL_MEASURE_PHRASE.test(query) || BULK_QUANTITY.test(query);
  if (!hasMeasure || !STAPLE_FOODS.test(query)) return null;
  return SECTOR_BY_VALUE["groceries_supermarket"] ?? null;
}

function normalizePhrases(text: string): string {
  const withoutMeasures = text.replace(MEASURE_PHRASE, " ");
  return PHRASE_SYNONYMS.reduce(
    (out, [pattern, word]) => out.replace(pattern, word),
    withoutMeasures,
  );
}

// A buyer phrase carrying an explicit task/service verb ("laptop repair",
// "fix my sink", "phone screen replacement") — OR naming a service
// profession outright ("a plumber", "a caterer") — is asking to have
// something DONE, never to buy a stocked item — even when the matched
// sector also sells retail products (e.g. "Computers & Laptops" is
// classified "both": it sells AND repairs laptops). Found live: "laptop
// repair" matched that sector and pulled fields from BOTH its service pool
// (Diagnosis Fee, Turnaround Time — genuinely relevant) AND its retail
// "Electronics" category (Battery, Power, RAM — nonsensical for a repair
// job), since selectClarifierFields has no notion of which pool actually
// fits what the buyer described. Deliberately a plain keyword check, not
// real NLP — same spirit as systemPrompt.ts's own "a build, a fix, a
// repair, an install..." list for tool-choice, reused here for field
// selection AND (exported) by statusPhrases.ts to pick "carries"
// (product-appropriate) vs "offers"/"does" (service-appropriate) wording
// in buyer-facing dead-end messages — a plumber or a repair job is never
// something a vendor "carries".
const TASK_KEYWORDS =
  /\b(repair|repairs|fix|fixing|install|installation|service|servicing|replace|replacement|clean|cleaning|cleaner|wash|washing|deliver|delivery|maintain|maintenance|plumber|electrician|caterer|catering|tailor|tailoring|mechanic|photographer|planner|developer|designer|decorator|barber|tutor|mover|movers|contractor|painter|technician|consultant|stylist)\b/i;

export function looksLikeServiceTask(query: string): boolean {
  return TASK_KEYWORDS.test(query);
}

/**
 * Whether Google Places (the retrieval backend's Tier 5 "real businesses
 * near you" fallback) may be surfaced for this search.
 *
 * PRODUCT SEARCHES: NO — explicit product decision, 2026-08-26. Places
 * answers "what businesses exist around here", which is a genuinely useful
 * answer to "I need a plumber" and a bad one to "I need a power bank":
 * a Places row carries no stock, no price and no way to know the shop has
 * the item, so a buyer asking for a THING got a wall of shop addresses
 * across five states that had never been checked for it. Found live on
 * "I need a power bank" — twenty businesses, one of them a curtain shop,
 * under a line promising somewhere to "find it close by".
 *
 * SERVICE SEARCHES: YES — a nearby tailor, mechanic or electrician IS the
 * deliverable, and "there is a real one at this address" is exactly the
 * information a buyer can act on.
 *
 * `explicit` (route.ts's scope check: seekingKind) wins outright when
 * known; the keyword heuristic is only the fallback for call sites that
 * have no intent signal of their own.
 */
export function allowsNearbyBusinesses(
  query: string,
  explicit?: boolean,
): boolean {
  return explicit ?? looksLikeServiceTask(query);
}

// 2026-08-25 redesign note: bareness is no longer judged here by token
// counting (a short-lived looksLikeBareQuery heuristic) — the scope check's
// own `hasSpecificDetails` field judges it with full conversation context
// instead (see classifyScopeTool.ts). This module's job narrowed back to
// what token matching is actually good at: mapping an already-extracted
// clean item term to a sector and its field pools.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Light suffix normalization so a buyer's word form matches the sector
// taxonomy's own. Applied to BOTH sides (query tokens and sector
// vocabulary), which is the whole point — exact token equality silently
// failed on the most ordinary service requests: "tailor" never matched the
// "Tailoring" sector, "plumber" never matched "Plumbing", "caterer" never
// matched "Catering", so those queries detected no sector at all and got no
// clarifying questions. Deliberately a handful of high-confidence rules,
// not a real stemmer (no Porter/Snowball dependency for this): each strip
// keeps a ≥3-char remainder, plural-"s" is never taken off a word ending in
// "ss" ("dress", "business"), and an over-eager strip only ever costs a
// wrong sector guess, which detection's MIN_SCORE + the capability filter
// already have to tolerate.
// Applied REPEATEDLY until stable, not once: the rules have to converge
// from both directions to be useful here, and a single pass doesn't. E.g.
// "bakery" → "baker" (y) but "baker" → "bak" (er) — one pass leaves those
// two forms unequal and the match still fails; iterating takes "bakery" all
// the way to "bak" too. Same for "tailoring" → "tailor" → "tail" meeting
// "tailor" → "tail". Three passes is far more than any of these rules need.
function stem(word: string): string {
  let w = word;
  for (let pass = 0; pass < 3; pass += 1) {
    const before = w;
    // Plurals. "sses" strips just "es" ("dresses" → "dress", which then
    // stops, since a bare "-ss" ending is never stripped) — without that
    // special case the guard protecting "dress" also blocked "dresses"
    // from ever reaching it.
    if (w.endsWith("sses")) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) {
      w = w.slice(0, -1);
    }
    // Verb/agent/abstract-noun endings — the three shapes the sector
    // taxonomy and a buyer's phrasing routinely disagree on
    // ("Plumbing"/"plumber", "Photography"/"photographer").
    else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
    else if (w.length > 4 && (w.endsWith("er") || w.endsWith("or"))) {
      w = w.slice(0, -2);
    } else if (w.length > 4 && w.endsWith("y")) w = w.slice(0, -1);
    if (w === before) break;
  }
  return w;
}

// Query side: the token, its stem, and any synonyms (themselves stemmed —
// the vocabulary they're matched against is stemmed too).
// One entry PER ORIGINAL QUERY WORD, not one flat bag of tokens. The
// distinction is the whole point: flattening let a single synonym-rich
// word outvote a literal match, because every synonym it expanded into
// scored separately. Found 2026-08-26 on "house cleaning" — `house`
// expands to real/estate/property, all three of which hit "Real Estate &
// Property Sales", so a buyer asking to have their house CLEANED was
// asked about Property Type, Documentation and Transaction Type while
// "Cleaning Services" (a literal, exact match on the other word) sat at
// one point. Grouping caps what one word can contribute and lets the
// literal/synonym distinction be scored (see scoreOver).
interface QueryTerm {
  /** The word itself and its stem — a hit here is a LITERAL match. */
  literal: Set<string>;
  /** Everything the synonym table adds — a weaker, inferred match. */
  inferred: Set<string>;
}

// Words that name WHERE work happens rather than what is wanted, once the
// request is a service. "house", "apartment" and "flat" map to real estate
// (right for "house for rent"), and each expands to three property words
// that all hit the same sector — enough, from one modifier, to outweigh
// the actual head noun. "house cleaning" landed on Real Estate & Property
// Sales, and "painting my house" on it too, so a buyer wanting their walls
// painted was asked about Property Type, Documentation and Transaction
// Type. For a service the premises are context, never the subject, so the
// expansion is simply withheld — the literal word still matches anything
// it genuinely matches.
const PREMISES_WORDS = new Set([
  "house",
  "houses",
  "apartment",
  "apartments",
  "flat",
  "flats",
  "home",
  "office",
  "shop",
  "compound",
]);

function expand(tokens: string[], prefer?: "retail" | "service"): QueryTerm[] {
  return tokens.map((t) => {
    const literal = new Set([t, stem(t)]);
    const inferred = new Set<string>();
    if (prefer === "service" && PREMISES_WORDS.has(t)) {
      return { literal, inferred };
    }
    for (const syn of SYNONYMS[t] ?? SYNONYMS[stem(t)] ?? []) {
      // Never both: several synonym lists restate the word itself in
      // another form ("phone" -> "phones"), and counting that as evidence
      // twice let a word quietly earn triple weight.
      if (!literal.has(syn)) inferred.add(syn);
      if (!literal.has(stem(syn))) inferred.add(stem(syn));
    }
    return { literal, inferred };
  });
}

// Stems that are ordinary standalone words in their own right, with no
// relation to the vocabulary word that produced them. Stemming is
// deliberately crude (see stem's own comment) and mostly that is harmless —
// "tailoring" -> "tail" and "ushering" -> "ush" collide with nothing a
// buyer would ever type. These seven do collide, found by auditing every
// stem the whole sector taxonomy produces:
//
//   engineering  -> engine   "engine oil" read as Architecture &
//                            Engineering Design
//   painting     -> paint    buckets of paint vs a painting SERVICE
//   marketing    -> market   a market vs Marketing & Advertising
//   stationery   -> station  a petrol station vs Stationery & Books
//   training     -> train    a train vs Training
//   short-lets   -> let      the ordinary English verb
//   ride-hailing -> hail
//
// Only the STEM is withheld — every vocabulary word still registers itself
// in full, so "engineering", "painting" and "marketing" all still match
// exactly. What is lost is the agent-noun route in ("engineer",
// "painter"), which SYNONYMS now covers explicitly: an inferred match is
// what those always were, and scoring them as such is more honest than
// reaching them through a coincidence.
const STEM_COLLISIONS = new Set([
  "engine",
  "paint",
  "market",
  "station",
  "train",
  "let",
  "hail",
]);

// Vocabulary side: both the raw token and its stem, so a match can happen
// on either form (see stem's own comment) — except where that stem is a
// collision (above), in which case only the raw token is registered.
function sectorVocabulary(sector: SectorLeaf): Set<string> {
  const out = new Set<string>();
  for (const t of tokenize(`${sector.label} ${sector.value}`)) {
    out.add(t);
    const stemmed = stem(t);
    if (stemmed !== t && STEM_COLLISIONS.has(stemmed)) continue;
    out.add(stemmed);
  }
  return out;
}

// A word the buyer actually said, matching a sector's own vocabulary, is
// worth double one this file INFERRED on their behalf via SYNONYMS. Before
// this they counted the same, so a synonym-rich word could outvote an
// exact one outright — "house cleaning" read as Real Estate (three points
// from `house` -> real/estate/property) over Cleaning Services (one point
// from the literal word "cleaning"), and a buyer wanting their house
// cleaned was asked about Property Type and Documentation.
const LITERAL_WEIGHT = 2;
const INFERRED_WEIGHT = 1;

// An inferred-only match still qualifies, exactly as before: this is the
// weakest score a single matching word can produce, so the set of queries
// that detect SOMETHING is unchanged by the weighting — only which sector
// wins when several match.
const MIN_SCORE = INFERRED_WEIGHT;

function isServiceCapableSector(sector: SectorLeaf): boolean {
  return (
    sector.classification === "service" ||
    sector.classification === "both" ||
    sector.classification === "food_both"
  );
}

function isRetailCapableSector(sector: SectorLeaf): boolean {
  return (
    sector.classification === "retail" ||
    sector.classification === "both" ||
    sector.classification === "food_both"
  );
}

// A dish-based sector (restaurants, bakery, street food, and catering's own
// food half) — its questions come from FOOD_DETAIL_PRESETS, never the
// retail product attributes: "Brand", "Material" and "Country of Origin"
// mean nothing for a plate of jollof or a birthday cake. Wiring this in
// closed a real hole — the food presets existed for the vendor-side listing
// wizard but the buyer-facing clarifier ignored them entirely, so every
// pure-food sector detected as a sector with NO fields and asked nothing.
function isFoodSector(sector: SectorLeaf): boolean {
  return (
    sector.classification === "food" || sector.classification === "food_both"
  );
}

/**
 * Token-overlap sector detection: the buyer's words (plus a small synonym
 * expansion) against each sector's own label/value vocabulary. "other" is
 * excluded as a match target — it's a catch-all, never a useful detection.
 * Returns null on no confident match (case d: unknown/ambiguous sector),
 * which is the correct, safe outcome — callers skip clarification entirely.
 *
 * `prefer` — the intent-aware half of the 2026-08-25 redesign: when the
 * buyer's intent is known (the scope check's seekingKind), detection first
 * considers ONLY sectors capable of that side, so a buy-intent "phone"
 * lands on the retail phones sector instead of "Phone & Gadget Repairs" —
 * found live, the synonym expansion (phone → repairs, added FOR repair
 * queries) let the repair sector outscore retail on a plain purchase and
 * ask a phone BUYER about Turnaround Time and Repair Warranty. Filtering
 * candidates by capability fixes the class, not the instance, and keeps
 * the synonyms intact for the genuine repair queries they serve. Falls
 * back to the unfiltered pool when the filtered one matches nothing — a
 * capability-mismatched detection still beats none for downstream uses
 * that only need the sector name.
 */
export function detectSector(
  query: string,
  prefer?: "retail" | "service",
): SectorLeaf | null {
  // Shape-based, ahead of scoring — see detectGroceryPurchase for why this
  // one case can't be settled by weights.
  const grocery = detectGroceryPurchase(query, prefer);
  if (grocery) return grocery;

  const queryTerms = expand(tokenize(normalizePhrases(query)), prefer);
  if (queryTerms.length === 0) return null;

  const scoreOver = (candidates: SectorLeaf[]): SectorLeaf | null => {
    let best: { sector: SectorLeaf; score: number; literal: number } | null =
      null;
    for (const sector of candidates) {
      if (sector.value === "other") continue;
      const vocab = sectorVocabulary(sector);
      let score = 0;
      let literalScore = 0;
      for (const term of queryTerms) {
        // How MUCH of the sector's vocabulary each word reaches still
        // counts — a synonym set matching three of a sector's own words is
        // genuinely stronger evidence than one matching a single generic
        // word ("Legal Services" vs "Event Planning Services" for
        // "lawyer"). What changed is the exchange rate: a word the buyer
        // actually said is worth double one this file inferred for them.
        for (const t of term.literal) {
          if (vocab.has(t)) literalScore += LITERAL_WEIGHT;
        }
        for (const t of term.inferred) {
          if (vocab.has(t)) score += INFERRED_WEIGHT;
        }
      }
      score += literalScore;
      // Ties go to the sector the buyer's OWN words reached, not the one
      // that happens to be declared first in the taxonomy. "house
      // cleaning" scored 4 for both Real Estate (entirely inferred, from
      // `house`) and Cleaning Services (entirely literal), and file order
      // handed it to Real Estate.
      if (
        score > 0 &&
        (!best ||
          score > best.score ||
          (score === best.score && literalScore > best.literal))
      ) {
        best = { sector, score, literal: literalScore };
      }
    }
    return best && best.score >= MIN_SCORE ? best.sector : null;
  };

  if (prefer) {
    const capable = ALL_SECTORS.filter(
      prefer === "retail"
        ? // Buying a dish is still buying — food sectors belong on the
          // retail side of this filter even though their fields come from
          // their own pool (see isFoodSector).
          (s) => isRetailCapableSector(s) || isFoodSector(s)
        : isServiceCapableSector,
    );
    const preferred = scoreOver(capable);
    if (preferred) return preferred;
  }
  return scoreOver(ALL_SECTORS);
}

function dedupeByName(fields: ClarifierField[]): ClarifierField[] {
  const seen = new Set<string>();
  const out: ClarifierField[] = [];
  for (const f of fields) {
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    out.push(f);
  }
  return out;
}

/** The sector-SPECIFIC pool: service-detail groups configured for this
 * sector (excluding the always-there General group) for a service-capable
 * classification, plus the sector's own product-attribute category
 * (excluding General) for a retail-capable one. Deliberately excludes
 * General — that's the fallback pool, never the first choice. `mode` (see
 * ClarifierMode) keeps each intent on its own side of a "both" sector:
 * "service" drops the retail pool (a job to be done never needs Battery/
 * Brand), "retail" drops the service pool (a purchase never needs
 * Turnaround Time), "auto" allows both — the pre-redesign behavior for
 * genuinely unknown intent. */
function sectorSpecificFields(
  sector: SectorLeaf,
  mode: ClarifierMode,
  // Phase 2 (docs/velte-ai-search-flow-plan.md): DB-backed overrides — a
  // matching entry replaces that group's in-code items wholesale; absent
  // entries (or no overrides at all) leave the shipped presets untouched.
  // Threaded from getSectorClarifiers, whose async callers fetch them via
  // getAttributeSchemaOverrides().
  overrides?: AttributeSchemaOverrides,
): ClarifierField[] {
  const fields: ClarifierField[] = [];
  const { listingConfig } = sector;
  const isServiceCapable = mode !== "retail" && isServiceCapableSector(sector);
  const isRetailCapable = mode !== "service" && isRetailCapableSector(sector);
  const isFood = mode !== "service" && isFoodSector(sector);

  if (isServiceCapable) {
    for (const group of getServiceDetailPresets(sector.value)) {
      if (group.group === "General") continue;
      fields.push(
        ...(overrides?.serviceGroups.get(group.group) ?? group.items),
      );
    }
  }

  if (isFood) {
    for (const group of getFoodDetailPresets(sector.value)) {
      if (group.group === "General") continue;
      fields.push(...group.items);
    }
  }

  if (isRetailCapable) {
    // attributeCategoryId (content) wins over productCategoryId (the real,
    // vendor-selectable category id) when both are set — see its own doc
    // comment in SectorListingConfig for why the two can legitimately differ.
    const categoryId =
      listingConfig?.attributeCategoryId ?? listingConfig?.productCategoryId;
    const categoryItems = categoryId
      ? (overrides?.productCategories.get(categoryId) ??
        PRODUCT_PRESETS_BY_CATEGORY[categoryId]?.items)
      : undefined;
    if (categoryItems) fields.push(...categoryItems);
  }

  return dedupeByName(fields);
}

/** The General fallback pool — only ever drawn from when the sector-specific
 * pool alone has fewer fields than the requested count. `mode` — see
 * sectorSpecificFields' own comment. */
function generalFields(
  sector: SectorLeaf,
  mode: ClarifierMode,
  overrides?: AttributeSchemaOverrides,
): ClarifierField[] {
  const fields: ClarifierField[] = [];
  const isServiceCapable = mode !== "retail" && isServiceCapableSector(sector);
  const isRetailCapable = mode !== "service" && isRetailCapableSector(sector);

  if (isServiceCapable) {
    const general = SERVICE_DETAIL_PRESETS.find((g) => g.group === "General");
    const items = overrides?.serviceGroups.get("General") ?? general?.items;
    if (items) fields.push(...items);
  }
  if (mode !== "service" && isFoodSector(sector)) {
    const general = FOOD_DETAIL_PRESETS.find((g) => g.group === "General");
    if (general) fields.push(...general.items);
  }
  if (isRetailCapable) {
    fields.push(
      ...(overrides?.productGeneral ?? GENERAL_PRODUCT_PRESETS.items),
    );
  }

  return dedupeByName(fields);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// `important` (see ClarifierField's own comment) marks the same handful of
// fields per group vendors are already nudged hardest to fill in, because
// they most affect AI match quality — the actual "key service details" this
// whole app already curates per sector. A buyer-facing clarifying question
// should ask about THOSE first, not draw uniformly at random across every
// field a sector happens to list. Each half is still shuffled on its own
// (so which important field leads varies session to session), but an
// important field always sorts ahead of a non-important one.
function prioritizeImportant(fields: ClarifierField[]): ClarifierField[] {
  const important = shuffle(fields.filter((f) => f.important));
  const rest = shuffle(fields.filter((f) => !f.important));
  return [...important, ...rest];
}

const DEFAULT_FIELD_COUNT = 3;

/**
 * Weighted, not random, selection of 2-3 fields to ask the buyer about.
 * Exhausts the sector-specific pool FIRST (important fields first within
 * it — see prioritizeImportant) — General is only ever drawn from to fill
 * a shortfall, never traded in for variety. Deterministic given a fixed
 * pool size relationship: sector-specific pool >= count always wins
 * outright; General only ever supplements, never replaces.
 */
export function selectClarifierFields(
  sector: SectorLeaf,
  count = DEFAULT_FIELD_COUNT,
  mode: ClarifierMode = "auto",
  overrides?: AttributeSchemaOverrides,
): ClarifierField[] {
  const specific = prioritizeImportant(
    sectorSpecificFields(sector, mode, overrides),
  );
  if (specific.length >= count) return specific.slice(0, count);

  const remaining = count - specific.length;
  const general = prioritizeImportant(generalFields(sector, mode, overrides));
  return [...specific, ...general.slice(0, remaining)];
}

/**
 * getSectorClarifiers(query) -> the detected sector + 2-3 weighted fields to
 * ask the buyer about, or null when no sector is confidently detected OR the
 * sector has no fields to offer for the intent in play. A
 * plain server-side helper, not a model-callable tool — see systemPrompt.ts
 * for why: it's computed once per turn and folded into a short conditional
 * paragraph, so the model's own tool-call set never gains an extra entry.
 * `query` doubles as the looksLikeServiceTask check (see its own comment) —
 * the exact same text used for sector detection also decides whether this
 * is a "get something done" request that should never surface retail
 * attributes, even for a sector that also sells products.
 */
export function getSectorClarifiers(
  query: string,
  count = DEFAULT_FIELD_COUNT,
  // See sectorSpecificFields — the DB-backed tuning layer; omitted means
  // pure in-code presets.
  overrides?: AttributeSchemaOverrides,
  // The scope check's own read of buyer intent (see SearchIntentKind) —
  // the 2026-08-25 redesign's key input: it steers BOTH which sectors
  // detection considers (a buy-intent "phone" must land on retail phones,
  // not "Phone & Gadget Repairs" — see detectSector's `prefer` comment)
  // AND which side of the sector's field pools questions draw from.
  // Omitted/"unclear" falls back to the task-keyword heuristic, which
  // resolves to "auto" (both pools) for genuinely ambiguous text.
  intent?: SearchIntentKind,
): SectorClarifiers | null {
  const mode: ClarifierMode =
    intent === "buy_item"
      ? "retail"
      : intent === "get_service" || looksLikeServiceTask(query)
        ? "service"
        : "auto";
  const sector = detectSector(
    query,
    mode === "retail" ? "retail" : mode === "service" ? "service" : undefined,
  );
  if (!sector) return null;

  const fields = selectClarifierFields(sector, count, mode, overrides);
  if (fields.length === 0) return null;

  return {
    sectorValue: sector.value,
    sectorLabel: sector.label,
    businessType: sector.classification,
    fields,
  };
}

/**
 * The SECTOR-LESS fallback pool — what to ask about when detection came up
 * empty but the buyer clearly named an item ("a power bank", "a blender",
 * "an inverter"). Added 2026-08-26 after a live report that a plain "I need
 * a power bank" asked nothing at all and went straight to a dead end: the
 * gate's whole "ask before searching" stage silently no-op'd because
 * detectSector returned null, and returning null there was — by design —
 * read by callers as "skip clarification entirely".
 *
 * That default is right for the parts of this module that FOLD a sector's
 * own vocabulary into a search, and wrong for the attribute gate, whose job
 * is simply to get SOME distinguishing detail before searching. Sector
 * detection matches a buyer's word against business-type LABELS, so the
 * item long tail misses constantly (a spot check of 50 everyday items:
 * 40 detected nothing) — no synonym list finishes that job, so the gate
 * needs a floor that doesn't depend on detection succeeding at all.
 *
 * Brand / Color / Condition (retail) and the General service group are
 * genuinely useful for ANY item or job, which is exactly why they're the
 * shared General pools in the first place — this just reaches for them
 * directly instead of only as a per-sector shortfall filler.
 */
export function getGeneralClarifierFields(
  intent?: SearchIntentKind,
  count = DEFAULT_FIELD_COUNT,
  overrides?: AttributeSchemaOverrides,
): ClarifierField[] {
  const fields: ClarifierField[] = [];
  if (intent !== "buy_item") {
    const general = SERVICE_DETAIL_PRESETS.find((g) => g.group === "General");
    const items = overrides?.serviceGroups.get("General") ?? general?.items;
    if (items) fields.push(...items);
  }
  if (intent !== "get_service") {
    fields.push(
      ...(overrides?.productGeneral ?? GENERAL_PRODUCT_PRESETS.items),
    );
  }
  return prioritizeImportant(dedupeByName(fields)).slice(0, count);
}

// Some preset examples already bake in their own "e.g. " prefix (the
// Electronics retail category's "e.g. 5000mAh", for one), others don't
// ("free diagnosis", "30 days") — a pre-existing inconsistency in
// attribute-presets.ts, shared with the vendor-facing Add-Offering
// wizard's own attribute suggestions, so not safe to normalize there
// without touching that surface too. Stripped here instead, at the one
// place this file adds its OWN "(e.g. ...)" wrapper — found live: without
// this, an already-prefixed example rendered as "(e.g. e.g. 5000mAh)".
function fieldPhrase(f: ClarifierField): string {
  if (!f.example) return f.name;
  const example = f.example.replace(/^e\.?g\.?\s*/i, "");
  return `${f.name} (e.g. ${example})`;
}

/**
 * A deterministic (no LLM) stand-in for buildSystemPrompt's own sectorNote
 * paragraph — used by resolveSearchItem.ts, which has no model call to ask
 * the question FOR it (see that file's own comment on why this path stayed
 * LLM-free). It draws from the exact same field data (getSectorClarifiers),
 * so it asks about the same real modifiers ("Capacity", "Menu Options" for
 * catering, etc.) a vendor's own listing actually carries — but it can't
 * rephrase them the way an LLM would, so it doesn't try to fold them into
 * one grammatical sentence.
 *
 * Found live: an earlier version asked "what's your Repair Warranty,
 * On-site Support, and Turnaround Time?" — grammatically tidy, but
 * backwards from a buyer's point of view (a repair WARRANTY is something a
 * VENDOR offers, not something the buyer has one of; the same "what's
 * your X" framing reads just as oddly for most preset field names, which
 * are all written from a vendor-listing perspective). Rendered as a plain
 * intro line + a real markdown bullet list (FormattedReply already parses
 * "- item" lines into a <ul>) instead: each field is presented as a thing
 * worth mentioning, not a question the buyer has to answer literally as
 * asked — self-explanatory without requiring any grammatical gymnastics
 * per field. The "mention whichever matter to you" framing sits in the
 * INTRO line, before the colon, rather than as its own closing sentence
 * after the list — FormattedReply's own parser treats a plain line right
 * after a list item as THAT item's continuation, not a new paragraph (so
 * lists don't fracture into two separately-numbered ones), so a trailing
 * sentence here would have visibly glued itself onto the last bullet
 * instead of standing on its own.
 */
export function buildClarifyingQuestion(
  term: string,
  fields: ClarifierField[],
): string {
  const bullets = fields.map((f) => `- ${fieldPhrase(f)}`).join("\n");
  return `Before I search for "${term}" — mention whichever of these matter to you, so I can match you with the right vendor:\n${bullets}`;
}

// Re-exported so consumers of this module can look up a sector by value
// without duplicating the import path. (An earlier comment referenced an
// eval script at scripts/eval-sector-clarifiers.ts — that script no longer
// exists; nothing external consumes this today.)
export { SECTOR_BY_VALUE };
