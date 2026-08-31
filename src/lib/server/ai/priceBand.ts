import { koboFromPriceText } from "@/lib/priceText";
import type {
  ExternalOffer,
  PriceBand,
  PriceBandChannel,
  PriceBandChannelId,
  PriceBandListing,
  PriceVerdict,
  VendorMatch,
} from "@/types/search";

// The fair-price check — "what should this actually cost?" (2026-08-30).
//
// The one question every Nigerian buyer is silently asking and nothing
// answers: prices here are not posted, and what you are quoted depends on
// how you look, how you talk, and whether the trader reads you as knowing
// the market.
//
// THIS FILE CONTAINS NO MODEL CALL, deliberately, and it is the same split
// recommendResults.ts and watchCandidates.ts already run on: **the model
// judges fit, code decides everything checkable.** Every judgement below is
// arithmetic over listings the turn already fetched, so a band costs nothing
// extra to produce and cannot be hallucinated. The model's only job
// downstream is the sentence it says around it.
//
// ── The rule that shaped everything here ────────────────────────────────
//
// NEVER BLEND TWO MARKETS. Jumia's price carries platform margin, delivery,
// seller fees and a returns policy. A trader in Computer Village imports
// closer to source, has almost no overhead, takes cash and offers no
// returns. Offline is routinely cheaper — sometimes by 20-30%.
//
// Averaged together, that does not produce a slightly-wrong number. It
// produces a number that is wrong IN THE DIRECTION THAT HURTS OUR OWN USER:
// somebody quoted ₦120,000 in the market gets told "that's fair" when they
// could have paid ₦95,000, and we have put a respectable-looking figure on
// top of an overcharge. That is the exact opposite of what this exists for.
//
// So channels are banded separately and the GAP between them is the headline
// — "buying local saves you about ₦25,000" is a better answer than any
// single price, and nobody else answers it.

/** Below this a band is noise, not information. Someone comparing ₦800
 *  sachets does not need us, and the listings at that end are dominated by
 *  accessories and bundles. Same reasoning as watchCandidates' own floor,
 *  set lower because reading a price costs nothing where watching one
 *  spends a quota slot. */
const MIN_BANDABLE_KOBO = 2_000 * 100; // ₦2,000

/** A listing under this share of the running middle is a different product —
 *  a ₦2,500 phone case caught in a phone search. Relative rather than
 *  absolute so it works for a ₦5,000 kettle and a ₦4m generator alike. */
const ACCESSORY_FLOOR_RATIO = 0.3;

/** Above this, the "same" listing costs more than a bundle would; almost
 *  always a multipack or the wrong product entirely. */
const OUTLIER_CEILING_RATIO = 4;

/** A single channel needs this many listings before its own band means
 *  anything. Two points is a line, not a market — but it is still worth
 *  showing as a channel, so this is the bar for a RANGE, not for inclusion. */
const MIN_PER_CHANNEL = 2;

/** Fewer comparable listings than this overall and we do not draw a band at
 *  all — we show what we found and say so. See the confidence ladder in
 *  `buildPriceBand`. */
const MIN_FOR_BAND = 3;

/** If the MIDDLE HALF of the comparable set is wider than this, these are
 *  not the same product however they were matched, and any middle we
 *  computed would be a confident fiction. Downgrade rather than guess. */
const MAX_CREDIBLE_SPREAD = 3;

/** The same judgement over the FULL range, and it is not redundant.
 *
 *  Found by testing: [₦12,000, ₦55,000, ₦60,000] — plainly not one product —
 *  passes the p25/p75 check comfortably at 1.7, because with a handful of
 *  points the quartiles interpolate inward and smooth away exactly the
 *  dispersion this is meant to catch. The full range says 5x and is right.
 *
 *  So both are checked. The middle-half test catches broad scatter in a big
 *  sample; this one catches a small sample that is really two products. */
const MAX_FULL_SPREAD = 4;

/** Prices that name a FLOOR rather than a price: "From ₦89,500".
 *
 *  Kept in step with watchCandidates.ts's identical pattern, and excluded
 *  for a sharper reason here: `parseOfferPrice` happily reads "From ₦89,500"
 *  as ₦89,500 because it holds exactly one number. Feeding that into a
 *  median drags the whole band below anything a buyer could actually pay,
 *  which would have us telling them a real quote was an overcharge. */
const FLOOR_PRICE_PATTERN =
  /\b(?:from|starting(?:\s+(?:at|from))?|as\s+low\s+as|min(?:imum)?)\b/i;

/** Seller-declared "used" in any of the forms Nigerian listings actually use.
 *
 *  Read from title AND description because that is where it lives — see
 *  ExternalOffer.description, kept for exactly this. */
const USED_PATTERN =
  /\b(?:uk[\s-]?used|used|tokunbo|second[\s-]?hand|refurb(?:ished)?|pre[\s-]?owned|grade\s?[abc]\b|for\s+parts|faulty)\b/i;

/** Formal retail: fixed price, margin, delivery, returns. Distinct from a
 *  market trader in every way that matters to what a thing costs.
 *
 *  Matched on the merchant/source string the connector reported. Anything
 *  unrecognised falls to `informal` rather than here, which is the safe
 *  direction: mistaking a small seller for Jumia would inflate the band the
 *  buyer is measured against, and inflating it is the harmful error. */
const FORMAL_MERCHANTS =
  /\b(?:jumia|konga|slot|pointek|justrite|shoprite|spar|game|3c\s?hub|casper|fouani|jendol|marketsquare)\b/i;

/** Which market a listing belongs to. */
function channelOf(
  merchant: string | null,
  source: string,
): PriceBandChannelId {
  const hay = `${merchant ?? ""} ${source}`;
  return FORMAL_MERCHANTS.test(hay) ? "formal" : "informal";
}

/** Ascending percentile over an already-sorted array of kobo values. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo));
}

/** The middle — never the average.
 *
 *  One mad ₦450,000 listing moves the mean of eight items by tens of
 *  thousands and the median by nothing. The middle only shifts when the real
 *  market shifts, which is the entire property we want from this number. */
function median(sorted: number[]): number {
  return percentile(sorted, 0.5);
}

/** Every priced, comparable listing this turn saw, tagged with its market. */
function collect(
  products: VendorMatch[],
  offers: ExternalOffer[],
): PriceBandListing[] {
  const out: PriceBandListing[] = [];

  for (const p of products) {
    // A quote-per-job service carries a placeholder 0, not a price — see
    // VendorMatch.quoteOnRequest. Banding it would invent a market.
    if (p.quoteOnRequest) continue;
    const kobo = Math.round(p.price * 100);
    if (!Number.isFinite(kobo) || kobo <= 0) continue;
    out.push({
      label: p.name,
      priceKobo: kobo,
      // A Velte vendor IS an offline vendor — a real shop with a real
      // location — so their price is a street price. This is the row that
      // gets better with every vendor onboarded, and the one Jumia and
      // Google structurally cannot reproduce.
      channel: "local",
      condition: USED_PATTERN.test(p.name) ? "used" : "new",
      merchant: null,
      url: null,
    });
  }

  for (const o of offers) {
    if (o.priceText && FLOOR_PRICE_PATTERN.test(o.priceText)) continue;
    const kobo = koboFromPriceText(o.priceText);
    if (kobo == null || kobo <= 0) continue;
    out.push({
      label: o.title,
      priceKobo: kobo,
      channel: channelOf(o.merchant, o.source),
      condition: USED_PATTERN.test(`${o.title} ${o.description ?? ""}`)
        ? "used"
        : "new",
      merchant: o.merchant,
      url: o.url,
    });
  }

  return out;
}

/** Drop the listings that are not the same product as everything else.
 *
 *  Two passes on purpose: the first middle is computed over raw data to
 *  establish the scale, then anything absurd relative to that scale is
 *  removed, because there is no fixed naira figure that separates "an
 *  accessory" from "the product" across every category Velte covers. */
function dropOutliers(listings: PriceBandListing[]): PriceBandListing[] {
  if (listings.length < 3) return listings;
  const scale = median(
    [...listings.map((l) => l.priceKobo)].sort((a, b) => a - b),
  );
  if (scale <= 0) return listings;
  return listings.filter(
    (l) =>
      l.priceKobo >= scale * ACCESSORY_FLOOR_RATIO &&
      l.priceKobo <= scale * OUTLIER_CEILING_RATIO,
  );
}

function channelBand(
  id: PriceBandChannelId,
  listings: PriceBandListing[],
): PriceBandChannel | null {
  if (listings.length === 0) return null;
  const sorted = listings.map((l) => l.priceKobo).sort((a, b) => a - b);
  return {
    id,
    count: sorted.length,
    lowKobo: percentile(sorted, 0.25),
    midKobo: median(sorted),
    highKobo: percentile(sorted, 0.75),
    // Below MIN_PER_CHANNEL the two numbers would be the two listings
    // themselves dressed up as a range, which reads as far more certain than
    // it is. The channel still appears — with a single figure.
    ranged: sorted.length >= MIN_PER_CHANNEL,
  };
}

/**
 * The fair-price answer for one search turn, or null when there is nothing
 * honest to say.
 *
 * Never returns a blended figure and never returns a band it cannot support.
 * The four confidence rungs, in the order they are tried:
 *
 *   band      — enough comparable listings, spread is credible
 *   rough     — enough to band, but the spread says treat it as a guide
 *   listings  — one or two prices; show them rather than pretend to a market
 *   null      — nothing priced at all; the caller asks what they were quoted
 *
 * "I don't know" is never the answer on its own. A feature that shrugs stops
 * being opened, so every rung above still hands the buyer something they did
 * not have a minute ago, and the caller turns the last one into a QUESTION.
 */
export function buildPriceBand(params: {
  products: VendorMatch[];
  offers: ExternalOffer[];
  /** What the buyer actually asked for — echoed back so the block can name
   *  the thing it priced. */
  query: string;
  /** The buyer's raw message, scanned for a price they say they were quoted.
   *
   *  Taken as the whole message rather than a pre-extracted number so the
   *  extraction rules live in one place with the market they are judged
   *  against — a caller that pulled the number itself could not know about
   *  MIN_BANDABLE_KOBO, and would eventually pass a ₦500 one. */
  message?: string | null;
}): PriceBand | null {
  const { products, offers, query, message } = params;

  const all = collect(products, offers);
  if (all.length === 0) return null;

  // New and used are two markets, exactly like online and offline, and for
  // the same reason: a UK-used iPhone and a new one do not share a price, so
  // one band over both is wrong for both. The used listings are counted and
  // reported, never folded in.
  const usedCount = all.filter((l) => l.condition === "used").length;
  const fresh = dropOutliers(all.filter((l) => l.condition === "new"));

  const comparable = fresh.filter((l) => l.priceKobo >= MIN_BANDABLE_KOBO);
  if (comparable.length === 0) return null;

  const sorted = comparable.map((l) => l.priceKobo).sort((a, b) => a - b);

  // Not enough to claim a market. Show the actual listings instead — two
  // real prices with the shops named is worth far more to a buyer than
  // silence, and it is honest about being two prices.
  if (comparable.length < MIN_FOR_BAND) {
    return {
      query,
      confidence: "listings",
      channels: [],
      listings: comparable.slice(0, 3),
      totalCount: comparable.length,
      usedCount,
      gapKobo: null,
      cheapestChannel: null,
      // No market, so nothing honest to judge a quote against and nothing to
      // negotiate from. The block asks what they were quoted anyway — that
      // answer becomes the next turn's search, which is where a real band
      // (and with it a verdict) has its best chance of existing.
      verdict: null,
      negotiable: false,
    };
  }

  const lowQ = percentile(sorted, 0.25);
  const spread = lowQ > 0 ? percentile(sorted, 0.75) / lowQ : Infinity;
  const fullSpread =
    sorted[0] > 0 ? sorted[sorted.length - 1] / sorted[0] : Infinity;
  const credible =
    spread <= MAX_CREDIBLE_SPREAD && fullSpread <= MAX_FULL_SPREAD;

  const channels = (["local", "informal", "formal"] as const)
    .map((id) =>
      channelBand(
        id,
        comparable.filter((l) => l.channel === id),
      ),
    )
    .filter((c): c is PriceBandChannel => c !== null);

  // The gap is the actual product: "where should I buy this, and what does
  // that choice cost me?" is a better question than "what is the price?".
  // Only meaningful between two channels that each have a real range —
  // otherwise it is the difference between two individual listings, which
  // is a coincidence, not a market structure.
  const ranged = channels.filter((c) => c.ranged);
  let gapKobo: number | null = null;
  let cheapestChannel: PriceBandChannelId | null = null;
  if (ranged.length >= 2) {
    const byMid = [...ranged].sort((a, b) => a.midKobo - b.midKobo);
    const cheapest = byMid[0];
    const dearest = byMid[byMid.length - 1];
    const diff = dearest.midKobo - cheapest.midKobo;
    // A gap under 5% is noise dressed as a finding; claiming a saving that
    // small would spend the buyer's trust on nothing.
    if (diff > cheapest.midKobo * 0.05) {
      gapKobo = diff;
      cheapestChannel = cheapest.id;
    }
  }

  return {
    query,
    // A credible spread earns the full claim; a wide one still gets a band,
    // marked as rough, because a wide honest range beats no answer.
    confidence: credible ? "band" : "rough",
    channels,
    listings: [],
    totalCount: comparable.length,
    usedCount,
    gapKobo,
    cheapestChannel,
    // Free with the band, and deliberately NOT separately metered: the buyer
    // named a price in a message they had already spent a search on, and
    // charging twice for one answer is how a helpful feature starts feeling
    // like a meter.
    verdict: message
      ? verdictWhenQuoted(extractQuotedPrice(message), channels)
      : null,
    // One market with a real range is the whole requirement — the brief's
    // numbers all come off a single channel, so a band with only single
    // figures cannot produce one.
    negotiable: channels.some((c) => c.ranged),
  };
}

/** verdictFor, but tolerant of "they didn't quote anything", which is the
 *  overwhelmingly common case. Keeps the null-check out of the return object
 *  above, where it would have been a nested ternary nobody could read. */
function verdictWhenQuoted(
  quotedKobo: number | null,
  channels: PriceBandChannel[],
): PriceVerdict | null {
  return quotedKobo == null ? null : verdictFor(quotedKobo, channels);
}

/** Categories the band is honest for.
 *
 *  The whole thing rests on an assumption that quietly fails outside these:
 *  a Tecno Spark 20 Pro IS the same object whoever sells it. Land is not —
 *  two plots 500m apart can legitimately differ threefold. Nor is a used
 *  car, a tailoring job, or a "paint bucket" of garri, where the measure
 *  itself is not standard between markets.
 *
 *  Forcing a band onto those produces exactly the confident-wrong answer the
 *  rest of this file is built to avoid, so they are excluded by name and get
 *  a different shape of answer instead (a rate, a typical job range, or the
 *  land checklist). Excluding is done on the SECTOR, not the model's
 *  judgement, because it must not be negotiable turn to turn. */
const UNBANDABLE_SECTOR =
  /\b(?:land|plot|property|properties|real\s?estate|house|houses|apartment|flat|rent|lease|acre|hectare|duplex|bungalow|self\s?con|bq)\b/i;

/** Is a fair-price band an honest answer for this search at all? */
export function isBandableQuery(query: string): boolean {
  return !UNBANDABLE_SECTOR.test(query);
}

// ── "Should I buy this?" — the buyer's own quoted price ──────────────────
//
// The band answers "what does this cost". This answers "is what I'm being
// asked to pay right", which is a different and much more urgent question,
// and it is the one that makes Velte worth opening by someone who already
// knows what they want and is standing in front of it.
//
// Everything below is a PARSER, not a model call, for the same reason the
// rest of this file is: a model asked to pull a number out of a sentence will
// eventually pull the wrong one, and the wrong one here means telling somebody
// their overcharge is fair.

/** Phrasing that makes a number a QUOTE — a price someone has actually been
 *  given. Read in a window before the amount, so "they're asking 135k"
 *  qualifies and a number that just happens to be in the sentence does not. */
const QUOTE_CUE =
  /\b(?:quote[ds]?|quoting|asking|asks|ask|selling|sells|sell|charging|charges?|offered?|offering|wants?|paying|pay|costs?|going\s+for|goes\s+for|listed|told\s+me|said|says|saw\s+it|seen\s+it|price(?:d)?(?:\s+(?:is|at))?|for)\s*(?:it|this|one|me|at|for|around|about|is|of|:)?\s*$/i;

/** Phrasing that makes a number a BUDGET — a ceiling the buyer set, not a
 *  price anybody quoted.
 *
 *  Checked FIRST and it wins outright. "I need a laptop under ₦700k" is the
 *  single most common shape of message this feature will ever see, and
 *  reading that as a quote would have Velte announce that the buyer's own
 *  budget is a fair price — confidently, and about a number nobody offered. */
const BUDGET_CUE =
  /\b(?:under|below|less\s+than|lower\s+than|max(?:imum)?|at\s+most|up\s+to|within|budget(?:\s+(?:is|of))?|not?\s+more\s+than|between|from|above|over|starting)\s*(?:of|is|:)?\s*$/i;

/** How far back to look for the cue. Long enough for "they quoted me about",
 *  short enough that a cue from an earlier clause can't reach across and
 *  qualify an unrelated number. */
const CUE_WINDOW = 32;

/** A bare figure and nothing else — "₦120,000", "135k".
 *
 *  Accepted with no cue at all, because the block's own copy asks for exactly
 *  this: the `listings` rung ends with "What were you quoted?", and the honest
 *  answer to that question is a number on its own. Requiring a cue would mean
 *  Velte asked a question and then ignored the reply. */
const BARE_AMOUNT =
  /^\s*(?:₦|n|ngn)?\s?[\d,.]+\s*(?:k|m)?\s*(?:naira)?\s*[.!]?\s*$/i;

/** Every number in a message, with enough context to judge each one. */
const AMOUNT_RE = /(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/gi;

/** A naira marker immediately before a number: "₦120,000", "N120,000",
 *  "NGN 120,000". The bare "N" needs the word boundary — without it, the "n"
 *  ending "seen" or "in" would mark the next number as money. */
const CURRENCY_MARK = /(?:₦|\bngn\b|\bn)\s*$/i;

/** The same thing, removed. Optional here, unlike CURRENCY_MARK, because this
 *  runs over every window whether or not one is present. */
const CURRENCY_TAIL = /(?:₦|\bngn\b|\bn)?\s*$/i;

function amountToKobo(raw: string, suffix: string | undefined): number | null {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const lower = suffix?.toLowerCase();
  // Nigerian shorthand, and it is how prices are actually said out loud —
  // "one twenty k", "1.2m". A parser that only read "120,000" would miss most
  // of what buyers type.
  const multiplier = lower === "m" ? 1_000_000 : lower === "k" ? 1_000 : 1;
  return Math.round(value * multiplier * 100);
}

/**
 * The price the buyer says they were quoted, in kobo, or null.
 *
 * Strict in the same way parseOfferPrice is, and for a sharper reason: a
 * number read out of a chat message and then judged against a market becomes
 * a sentence about that buyer's money. Everything ambiguous yields null, and
 * null simply means no verdict — which costs nothing, where a wrong verdict
 * costs the buyer's trust and possibly their money.
 *
 * Four things must hold before a number counts as a quote:
 *   1. it looks like MONEY — a ₦/N marker, a k/m suffix, comma grouping, or
 *      the word "naira". Without this, "iPhone 12" is a ₦12 quote and "size
 *      42" is a ₦42 one.
 *   2. no budget cue immediately before it ("under 700k" is a ceiling).
 *   3. a quote cue before it — OR the whole message is just the figure.
 *   4. it clears MIN_BANDABLE_KOBO, the same floor the band itself uses.
 */
export function extractQuotedPrice(message: string): number | null {
  if (!message) return null;

  const bare = BARE_AMOUNT.test(message);
  let found: number | null = null;

  AMOUNT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AMOUNT_RE.exec(message)) !== null) {
    const [full, digits, suffix] = match;
    const window = message.slice(
      Math.max(0, match.index - CUE_WINDOW),
      match.index,
    );
    const after = message.slice(
      match.index + full.length,
      match.index + full.length + 8,
    );

    // (1) Is it money at all?
    const marked = CURRENCY_MARK.test(window);
    const isMoney =
      marked ||
      Boolean(suffix) ||
      digits.includes(",") ||
      /^\s*naira\b/i.test(after);
    if (!isMoney) continue;

    // The currency mark sits BETWEEN the cue and the number — "they're asking
    // ₦135,000" — so both cue patterns would fail against the raw window,
    // which anchors at its end. Stripping it is what makes the commonest
    // phrasing in the whole feature work at all; found by testing exactly
    // that sentence.
    const before = window.replace(CURRENCY_TAIL, "");

    // (2) A ceiling the buyer set is never a quote, whatever else surrounds it.
    if (BUDGET_CUE.test(before)) continue;

    // (3) Someone must have named this price, or it must be the entire message.
    if (!bare && !QUOTE_CUE.test(before)) continue;

    const kobo = amountToKobo(digits, suffix);
    // (4) Same floor as the band — below it there is no market to judge against.
    if (kobo == null || kobo < MIN_BANDABLE_KOBO) continue;

    // The LAST qualifying figure wins. "I saw it for 120k but he's asking
    // 135k" is a real sentence, and the price being judged is the one they
    // are being asked to pay now, not the one they saw earlier.
    found = kobo;
  }

  return found;
}

/** How far above the normal range still counts as merely "high" rather than
 *  a quote we cannot explain at all. A quarter over the top of the range is
 *  a hard bargain; double it is a different product, a different condition,
 *  or someone trying it on. */
const OVERPRICED_RATIO = 1.25;

/**
 * Where a quoted price sits — measured against ONE named market, never a
 * blend.
 *
 * The channel chosen is the CHEAPEST one with a real range, and that choice
 * is the whole ethic of this file applied to a verdict. Measuring against a
 * blend would inflate the bar and hand somebody being overcharged a
 * respectable-looking "that's fair"; measuring against the cheapest errs the
 * other way, toward "you can do better", which is the direction that cannot
 * hurt the person reading it. The channel is carried on the verdict and shown,
 * so the claim stays checkable rather than becoming an oracle.
 */
function verdictFor(
  quotedKobo: number,
  channels: PriceBandChannel[],
): PriceVerdict | null {
  const ranged = channels.filter((c) => c.ranged);
  if (ranged.length === 0) return null;
  const against = [...ranged].sort((a, b) => a.midKobo - b.midKobo)[0];

  const status: PriceVerdict["status"] =
    quotedKobo <= against.lowKobo
      ? "good"
      : quotedKobo <= against.highKobo
        ? "fair"
        : quotedKobo <= against.highKobo * OVERPRICED_RATIO
          ? "high"
          : "overpriced";

  return {
    quotedKobo,
    status,
    against: against.id,
    deltaKobo: quotedKobo - against.midKobo,
  };
}
