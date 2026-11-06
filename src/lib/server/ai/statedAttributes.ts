// Deterministic extraction of matching details the buyer actually named
// (colour, brand, size, material, condition). Used so a details-gate turn
// that never runs searchProducts still records "black" on the goal sheet,
// and so a later "Nike UK8" answer cannot silently drop that colour.
//
// Keep this list in the same spirit as staffly-ai-backend's
// retrieval.service.js (COLOR_ALIASES / KNOWN_BRANDS / materials) — the
// retrieval side is what decides Exact vs Similar; this side's job is to
// not forget what the buyer said.

const COLOR_WORDS = [
  "black",
  "white",
  "ivory",
  "cream",
  "beige",
  "nude",
  "khaki",
  "red",
  "burgundy",
  "maroon",
  "blue",
  "navy",
  "indigo",
  "green",
  "olive",
  "brown",
  "tan",
  "chocolate",
  "grey",
  "gray",
  "charcoal",
  "silver",
  "gold",
  "golden",
  "pink",
  "rose",
  "purple",
  "violet",
  "lilac",
  "yellow",
  "mustard",
  "orange",
] as const;

const COLOR_COMPOUND_RE =
  /\b(?:black[\s-]?tie|blackout|blacklist|whiteboard|white[\s-]?collar|whitelist)\b/gi;

const BRAND_WORDS = [
  "nike",
  "adidas",
  "puma",
  "gucci",
  "reebok",
  "converse",
  "vans",
  "fila",
  "asics",
  "skechers",
  "timberland",
  "crocs",
  "samsung",
  "apple",
  "iphone",
  "tecno",
  "infinix",
  "oraimo",
  "xiaomi",
  "huawei",
  "hp",
  "dell",
  "lenovo",
  "asus",
  "lg",
  "sony",
  "canon",
  "nikon",
  "hisense",
  "thermocool",
  "binatone",
  "itel",
  "nokia",
  "tcl",
  "haier",
  "midea",
  "syinix",
  "lontor",
  "scanfrost",
  "polystar",
] as const;

const MATERIAL_WORDS = [
  "leather",
  "suede",
  "canvas",
  "mesh",
  "cotton",
  "polyester",
  "silk",
  "wool",
  "denim",
  "linen",
  "satin",
  "nylon",
  "rubber",
  "plastic",
  "wood",
  "wooden",
  "metal",
  "ankara",
  "lace",
  "chiffon",
  "velvet",
  "crepe",
  "organza",
  "brocade",
] as const;

const CONDITION_WORDS = ["used", "tokunbo", "refurbished", "sealed"] as const;

const SIZE_TOKEN =
  /(?:uk|us|eu)\s*\d{1,2}(?:\.\d)?|\bsize\s+\d{1,2}(?:\.\d)?|\bsize\s+(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl)\b|\b(?:xxs|xxl|xxxl|2xl|3xl|4xl|xs|xl)\b/gi;

// `inch(?:es)?` — `inches?` is "inche"/"inches" and never matches "32 inch".
const SPEC_TOKEN =
  /(\d+(?:\.\d+)?)[\s-]*(gb|tb|mb|inch(?:es)?|"|\bin\b|kgs?|kilos?|kilograms?|litres?|liters?|\bl\b|watts?|\bw\b|mah|megapixels?|\bmp\b|hz|kva|kwh|\bkw\b|cm|mm|\bhp\b)/gi;

const SPEC_UNIT_CANON: Record<string, string> = {
  gb: "gb",
  tb: "tb",
  mb: "mb",
  inch: "inch",
  inches: "inch",
  in: "inch",
  '"': "inch",
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  l: "l",
  litre: "l",
  liter: "l",
  litres: "l",
  liters: "l",
  w: "w",
  watt: "w",
  watts: "w",
  mah: "mah",
  mp: "mp",
  megapixel: "mp",
  megapixels: "mp",
  hz: "hz",
  kva: "kva",
  kw: "kw",
  kwh: "kwh",
  cm: "cm",
  mm: "mm",
  hp: "hp",
};

const STOP = new Set([
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
  "good",
  "nice",
  "great",
  "quality",
  "very",
  "need",
  "want",
  "looking",
  "get",
  "buy",
  "please",
  "thank",
  "thanks",
  "just",
  "really",
  "something",
  "anything",
]);

function padded(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
}

function wordsIn(text: string, lexicon: readonly string[]): string[] {
  const hay = padded(text);
  return lexicon.filter((w) => hay.includes(` ${w} `));
}

/**
 * Matching details named in free text, for any product or service — colour,
 * brand, size, material, numbered spec (256GB, 32 inch, 5kVA), plus other
 * distinctive words that aren't the item itself ("ankara" from "ankara
 * gown"). Retrieval uses these on every category, not sneakers alone.
 */
export function extractStatedAttributes(
  text: string,
  itemTerm?: string | null,
): string[] {
  if (!text.trim()) return [];
  const cleaned = text.replace(COLOR_COMPOUND_RE, " ");
  const skip = new Set(
    (itemTerm ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1),
  );

  const found: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const key = raw.toLowerCase().trim();
    if (!key || skip.has(key) || STOP.has(key) || seen.has(key)) return;
    seen.add(key);
    found.push(raw.trim());
  };

  for (const w of wordsIn(cleaned, COLOR_WORDS)) push(w);
  for (const w of wordsIn(cleaned, BRAND_WORDS)) push(w);
  for (const w of wordsIn(cleaned, MATERIAL_WORDS)) push(w);
  for (const w of wordsIn(cleaned, CONDITION_WORDS)) push(w);
  const sizeRe = new RegExp(SIZE_TOKEN.source, "gi");
  for (const match of cleaned.toLowerCase().matchAll(sizeRe)) {
    push(match[0].replace(/\s+/g, " ").trim());
  }
  const specRe = new RegExp(SPEC_TOKEN.source, "gi");
  for (const match of cleaned.toLowerCase().matchAll(specRe)) {
    const num = match[1];
    const canon = SPEC_UNIT_CANON[(match[2] || "").toLowerCase()];
    if (!num || !canon) continue;
    push(canon === "inch" ? `${num} inch` : `${num}${canon}`);
  }
  for (const w of padded(cleaned).trim().split(/\s+/)) {
    if (w.length < 4) continue;
    if (
      /^(inch|inches|gigs?|watts?|litres?|liters?|kilo|kilos|size|brand|colou?r|type|kind|model)$/.test(
        w,
      )
    )
      continue;
    if (COLOR_WORDS.includes(w as (typeof COLOR_WORDS)[number])) continue;
    if (BRAND_WORDS.includes(w as (typeof BRAND_WORDS)[number])) continue;
    if (MATERIAL_WORDS.includes(w as (typeof MATERIAL_WORDS)[number])) continue;
    push(w);
  }
  return found;
}

export function mergeAttributeLists(
  ...lists: Array<string[] | null | undefined>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list?.length) continue;
    for (const raw of list) {
      const a = raw.trim();
      if (!a) continue;
      const key = a.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}
