import { ALL_SECTORS, SECTOR_BY_VALUE } from "@/lib/sectors";
import {
  SERVICE_DETAIL_PRESETS,
  GENERAL_PRODUCT_PRESETS,
  PRODUCT_PRESETS_BY_CATEGORY,
  getServiceDetailPresets,
} from "@/lib/attribute-presets";
import type {
  ClarifierField,
  SectorClarifiers,
  SectorLeaf,
} from "@/types/sectors";

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
};

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function expand(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    for (const syn of SYNONYMS[t] ?? []) out.add(syn);
  }
  return out;
}

function sectorVocabulary(sector: SectorLeaf): Set<string> {
  return new Set(tokenize(`${sector.label} ${sector.value}`));
}

const MIN_SCORE = 1;

/**
 * Token-overlap sector detection: the buyer's words (plus a small synonym
 * expansion) against each sector's own label/value vocabulary. "other" is
 * excluded as a match target — it's a catch-all, never a useful detection.
 * Returns null on no confident match (case d: unknown/ambiguous sector),
 * which is the correct, safe outcome — callers skip clarification entirely.
 */
export function detectSector(query: string): SectorLeaf | null {
  const queryTokens = expand(tokenize(query));
  if (queryTokens.size === 0) return null;

  let best: { sector: SectorLeaf; score: number } | null = null;
  for (const sector of ALL_SECTORS) {
    if (sector.value === "other") continue;
    const vocab = sectorVocabulary(sector);
    let score = 0;
    for (const t of queryTokens) if (vocab.has(t)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { sector, score };
  }
  return best && best.score >= MIN_SCORE ? best.sector : null;
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
 * General — that's the fallback pool, never the first choice. `serviceOnly`
 * (see looksLikeServiceTask) drops the retail pool entirely regardless of
 * the sector's own classification — a "both" sector's retail attributes
 * are for a vendor's product LISTING, never relevant to a buyer describing
 * a job to be done. */
function sectorSpecificFields(
  sector: SectorLeaf,
  serviceOnly: boolean,
): ClarifierField[] {
  const fields: ClarifierField[] = [];
  const { classification, listingConfig } = sector;
  const isServiceCapable =
    classification === "service" ||
    classification === "both" ||
    classification === "food_both";
  const isRetailCapable =
    !serviceOnly &&
    (classification === "retail" ||
      classification === "both" ||
      classification === "food_both");

  if (isServiceCapable) {
    for (const group of getServiceDetailPresets(sector.value)) {
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
    const category = categoryId
      ? PRODUCT_PRESETS_BY_CATEGORY[categoryId]
      : undefined;
    if (category) fields.push(...category.items);
  }

  return dedupeByName(fields);
}

/** The General fallback pool — only ever drawn from when the sector-specific
 * pool alone has fewer fields than the requested count. `serviceOnly` — see
 * sectorSpecificFields' own comment. */
function generalFields(
  sector: SectorLeaf,
  serviceOnly: boolean,
): ClarifierField[] {
  const { classification } = sector;
  const fields: ClarifierField[] = [];
  const isServiceCapable =
    classification === "service" ||
    classification === "both" ||
    classification === "food_both";
  const isRetailCapable =
    !serviceOnly &&
    (classification === "retail" ||
      classification === "both" ||
      classification === "food_both");

  if (isServiceCapable) {
    const general = SERVICE_DETAIL_PRESETS.find((g) => g.group === "General");
    if (general) fields.push(...general.items);
  }
  if (isRetailCapable) fields.push(...GENERAL_PRODUCT_PRESETS.items);

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
  serviceOnly = false,
): ClarifierField[] {
  const specific = prioritizeImportant(
    sectorSpecificFields(sector, serviceOnly),
  );
  if (specific.length >= count) return specific.slice(0, count);

  const remaining = count - specific.length;
  const general = prioritizeImportant(generalFields(sector, serviceOnly));
  return [...specific, ...general.slice(0, remaining)];
}

/**
 * getSectorClarifiers(query) -> the detected sector + 2-3 weighted fields to
 * ask the buyer about, or null when no sector is confidently detected OR the
 * sector has no fields to offer (e.g. a pure "food" classification, which
 * has neither a service-detail nor a product-attribute mapping today). A
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
): SectorClarifiers | null {
  const sector = detectSector(query);
  if (!sector) return null;

  const fields = selectClarifierFields(
    sector,
    count,
    looksLikeServiceTask(query),
  );
  if (fields.length === 0) return null;

  return {
    sectorValue: sector.value,
    sectorLabel: sector.label,
    businessType: sector.classification,
    fields,
  };
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

// Re-exported for the deterministic eval script (scripts/eval-sector-clarifiers.ts)
// so it can look up a sector by value without duplicating the import path.
export { SECTOR_BY_VALUE };
