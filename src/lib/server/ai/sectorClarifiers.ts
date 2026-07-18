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
 * General — that's the fallback pool, never the first choice. */
function sectorSpecificFields(sector: SectorLeaf): ClarifierField[] {
  const fields: ClarifierField[] = [];
  const { classification, listingConfig } = sector;
  const isServiceCapable =
    classification === "service" ||
    classification === "both" ||
    classification === "food_both";
  const isRetailCapable =
    classification === "retail" ||
    classification === "both" ||
    classification === "food_both";

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
 * pool alone has fewer fields than the requested count. */
function generalFields(sector: SectorLeaf): ClarifierField[] {
  const { classification } = sector;
  const fields: ClarifierField[] = [];
  const isServiceCapable =
    classification === "service" ||
    classification === "both" ||
    classification === "food_both";
  const isRetailCapable =
    classification === "retail" ||
    classification === "both" ||
    classification === "food_both";

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

const DEFAULT_FIELD_COUNT = 3;

/**
 * Weighted, not random, selection of 2-3 fields to ask the buyer about.
 * Exhausts the sector-specific pool FIRST (shuffled, so which fields get
 * asked varies session to session) — General is only ever drawn from to
 * fill a shortfall, never traded in for variety. Deterministic given a
 * fixed pool size relationship: sector-specific pool >= count always wins
 * outright; General only ever supplements, never replaces.
 */
export function selectClarifierFields(
  sector: SectorLeaf,
  count = DEFAULT_FIELD_COUNT,
): ClarifierField[] {
  const specific = shuffle(sectorSpecificFields(sector));
  if (specific.length >= count) return specific.slice(0, count);

  const remaining = count - specific.length;
  const general = shuffle(generalFields(sector));
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
 */
export function getSectorClarifiers(
  query: string,
  count = DEFAULT_FIELD_COUNT,
): SectorClarifiers | null {
  const sector = detectSector(query);
  if (!sector) return null;

  const fields = selectClarifierFields(sector, count);
  if (fields.length === 0) return null;

  return {
    sectorValue: sector.value,
    sectorLabel: sector.label,
    businessType: sector.classification,
    fields,
  };
}

// Re-exported for the deterministic eval script (scripts/eval-sector-clarifiers.ts)
// so it can look up a sector by value without duplicating the import path.
export { SECTOR_BY_VALUE };
