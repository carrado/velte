import { tool } from "ai";
import { z } from "zod";
import type { UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import { parseOfferPrice } from "@/lib/priceText";
import { fmt } from "@/lib/product-price";
import {
  sanitizeReason,
  candidateSummary,
  offerSummary,
  collectOfferPhotos,
  offersDiffer,
  differsMeaningfully,
} from "@/lib/server/ai/recommendResults";
import type {
  ComparisonRow,
  ComparisonTemplate,
  ExternalOffer,
  StoreMatch,
  VendorMatch,
} from "@/types/search";

// The full "Universal Comparison Template" (2026-09-05) — built ONLY on a
// genuine COMPARE turn (the buyer explicitly selected Compare and
// toolAlignment.ts confirmed it fits, or classifyScopeTool detected the
// same thing unprompted — see route.ts's own `isCompareTurn`). Every other
// multi-result turn keeps recommendResults.ts's lighter picks unchanged;
// this is a SEPARATE, richer call, not a replacement for that one.
//
// Same "source is never part of the comparison logic" principle the design
// doc this was built from insists on: a ComparisonTemplate's shape is
// identical whichever side of the Velte/external boundary it came from —
// only which builder function is called, and each row's own `source` field,
// says where a candidate actually lives. The boundary itself is unchanged
// from today (2026-09-05 product decision): Velte candidates and external
// offers are still never mixed in the SAME comparison — external only ever
// exists on a genuine Velte dead-end (see route.ts's own nothingOnVelte
// gate), so merging them into one call would mean firing Serper on
// ordinary compare turns too, a real cost change nobody has asked for yet.
// The `source` field is still real per row (not hardcoded once per turn)
// purely so that a future merge is a data change, not a shape change.
//
// Same division of labor as recommendResults.ts throughout: the MODEL
// judges fit, names the criteria that actually mattered for THIS request,
// and writes the one-line/one-paragraph verdicts; CODE decides everything
// checkable — every row's name/price/source, `nearestId`, id verification
// against the real candidate set, and sanitizing every string the model
// wrote. Every failure path returns null, and route.ts falls back to plain
// cards exactly as a failed recommendResults.ts call already does.

// Slightly longer than recommendResults.ts's own RECOMMEND_TIMEOUT_MS: this
// call's output schema is considerably larger (a row per candidate, plus
// criteria, a third pick, a recommendation paragraph, and guidance lines),
// so it's given a bit more room before the turn falls back to plain cards.
const TEMPLATE_TIMEOUT_MS = 10_000;
const EXTERNAL_TEMPLATE_TIMEOUT_MS = 14_000;

// A comparison table beyond this stops being something a buyer can actually
// weigh at a glance — same reasoning as recommendResults.ts's own
// MAX_PHOTOS_TOTAL being a hard budget rather than "as many as exist".
// Candidates beyond the cap still render as ordinary cards below the
// template; they're just not part of the compared set.
const MAX_COMPARISON_ROWS = 6;

// "My recommendation" is a PARAGRAPH, not a chip line — the schema asks for
// 2-3 sentences under 60 words, which is comfortably past sanitizeReason's
// 220-char default and was being cut off mid-sentence on screen (reported
// 2026-09-05). 60 words of ordinary English runs ~400 characters, so this
// leaves real headroom while staying a guarantee rather than a target.
const MAX_RECOMMENDATION_LENGTH = 700;

function compareTemplateTool(candidateIds: string[]) {
  return tool({
    description:
      "Call this exactly once with your full comparison of the candidates given.",
    inputSchema: z.object({
      leadIn: z
        .string()
        .describe(
          "ONE short, natural sentence in your own conversational voice introducing the comparison (e.g. 'Here's how these stack up:'). Never a generic heading, never contact details.",
        ),
      substitutionNote: z
        .string()
        .nullable()
        .describe(
          "ONE honest sentence, ONLY when what you are comparing is not quite what the buyer literally named — compare the buyer's OWN WORDING for each thing against what these candidates ACTUALLY are, for every category, not only vehicles: a named model that doesn't exist at all ('Lexus Jeep 2026' — Lexus makes no vehicle called that, so you're showing the closest real Lexus SUVs), an exact model that exists but wasn't among the candidates so you're showing related ones ('iPhone 17 Pro Max' asked for, only the 16 Pro Max turned up), or a specific request answered with a broader category (a 'wedding photographer' shown alongside general event photographers). Say plainly what you could not find and what you found instead, in the buyer's own terms — e.g. \"I couldn't find an exact 'Lexus Jeep 2026' listing, so I've compared the closest Lexus SUVs instead,\" or \"No iPhone 17 Pro Max listings came up, so these are the closest current iPhone models.\" null when the candidates genuinely ARE what was asked for, with no gap to disclose — never invent a caveat on a clean match just to fill this field.",
        ),
      criteria: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe(
          "2-5 short phrases naming what actually matters for THIS buyer's request, in the order of importance you judged them — e.g. ['price', 'battery life', 'camera'] for a phone request, or ['availability', 'portfolio', 'price'] for 'I need a wedding photographer tomorrow'. Derive these from the buyer's own words and what the candidates actually differ on — never a fixed list reused turn to turn.",
        ),
      rows: z
        .array(
          z.object({
            id: z.string().describe(`One of: ${candidateIds.join(", ")}`),
            bestFor: z
              .string()
              .nullable()
              .describe(
                "ONE short phrase (under 8 words) on who or what this specific candidate suits best — e.g. 'tight budgets', 'video-first buyers', 'same-day pickup'. null if nothing distinguishes it.",
              ),
            keyStrength: z
              .string()
              .nullable()
              .describe(
                "ONE short phrase naming this candidate's strongest real point from the data given — a spec, a price edge, a completeness edge. null if nothing stands out.",
              ),
            mainDrawback: z
              .string()
              .nullable()
              .describe(
                "ONE short phrase naming this candidate's real weak point from the data given, or null if it has none worth flagging. Never invent a drawback the data doesn't show.",
              ),
          }),
        )
        .describe(
          "One entry per candidate given, same ids, any order. Every candidate needs a row even if every field on it is null.",
        ),
      bestOverallId: z
        .string()
        .describe(
          "The `id` of the candidate that best fits the request overall.",
        ),
      bestOverallReason: z
        .string()
        .describe(
          "ONE sentence (under 28 words) citing a concrete fact from this candidate's own data, and how it beats the alternatives where the comparison makes that obvious. Never generic filler, never contact details.",
        ),
      bestValueId: z
        .string()
        .nullable()
        .describe(
          "The `id` of the smartest price-for-what-you-get candidate, or null if that's the same as bestOverallId or nothing stands out on value.",
        ),
      bestValueReason: z
        .string()
        .nullable()
        .describe(
          "ONE sentence showing both what it costs AND what that money gets, relative to the others. null when bestValueId is null.",
        ),
      thirdPickLabel: z
        .string()
        .nullable()
        .describe(
          "A short, DYNAMIC label for a third axis worth its own call-out beyond overall fit and value — e.g. 'Best for video', 'Best portfolio', 'Fastest available' — whatever this request's own criteria actually turned up. null if nothing beyond the first two picks is worth separating out.",
        ),
      thirdPickId: z
        .string()
        .nullable()
        .describe(
          "The `id` this third pick belongs to, distinct from bestOverallId and bestValueId. null when thirdPickLabel is null.",
        ),
      thirdPickReason: z
        .string()
        .nullable()
        .describe(
          "ONE sentence justifying the third pick from real data. null when thirdPickLabel is null.",
        ),
      tradeoffId: z
        .string()
        .nullable()
        .describe(
          "The `id` of a candidate tempting for one reason but with a real catch the buyer should know before choosing it. null if none has a genuine catch.",
        ),
      tradeoffNote: z
        .string()
        .nullable()
        .describe(
          "ONE short sentence naming the catch plainly from real data. null when tradeoffId is null.",
        ),
      recommendationNote: z
        .string()
        .describe(
          "A short paragraph (2-3 sentences, under 60 words) giving your actual, personalized recommendation — synthesize the picks above into real advice for THIS buyer's stated need, not just a restatement of them. Never contact details.",
        ),
      guidance: z
        .array(
          z.object({
            id: z.string().describe(`One of: ${candidateIds.join(", ")}`),
            condition: z
              .string()
              .describe(
                "A short 'if…' clause completing 'Choose this one if {condition}' — a real, data-backed reason a DIFFERENT kind of buyer than the one bestOverallReason targets would want this specific candidate instead (e.g. 'you need it delivered today', 'budget matters more than brand'). Never repeat the same condition on two entries.",
              ),
          }),
        )
        .max(3)
        .describe(
          "Up to 3 'choose X if…' lines, typically over the picks above — omit rather than force one for a candidate with nothing genuinely distinguishing.",
        ),
    }),
    execute: async (v) => v,
  });
}

type CompareTemplateVerdict = {
  leadIn: string;
  substitutionNote: string | null;
  criteria: string[];
  rows: {
    id: string;
    bestFor: string | null;
    keyStrength: string | null;
    mainDrawback: string | null;
  }[];
  bestOverallId: string;
  bestOverallReason: string;
  bestValueId: string | null;
  bestValueReason: string | null;
  thirdPickLabel: string | null;
  thirdPickId: string | null;
  thirdPickReason: string | null;
  tradeoffId: string | null;
  tradeoffNote: string | null;
  recommendationNote: string;
  guidance: { id: string; condition: string }[];
};

/** Sanitizes and caps the criteria list — dropped entries leave a shorter,
 *  still-honest list rather than failing the whole template. */
function sanitizeCriteria(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => sanitizeReason(c))
    .filter((c): c is string => Boolean(c))
    .slice(0, 5);
}

function sanitizeGuidance(
  raw: unknown,
  validIds: Set<string>,
): { id: string; condition: string }[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: { id: string; condition: string }[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { id, condition } = entry as { id?: unknown; condition?: unknown };
    if (typeof id !== "string" || !validIds.has(id) || seen.has(id)) continue;
    const cleaned = sanitizeReason(condition);
    if (!cleaned) continue;
    seen.add(id);
    out.push({ id, condition: cleaned });
    if (out.length >= 3) break;
  }
  return out;
}

/** Merges the model's per-candidate judgments with the deterministic
 *  name/price/source fields — a row only ever exists for a real candidate,
 *  and a candidate with no model row still gets one with every judged field
 *  null rather than being silently dropped from the table. */
interface DeterministicRow {
  name: string;
  priceLabel: string;
  source: "velte" | "external";
  location: string | null;
}

function buildRows(
  verdictRows: CompareTemplateVerdict["rows"] | undefined,
  deterministic: Map<string, DeterministicRow>,
): ComparisonRow[] {
  const byId = new Map(
    (verdictRows ?? [])
      .filter((r) => r && typeof r.id === "string")
      .map((r) => [r.id, r]),
  );
  const rows: ComparisonRow[] = [];
  for (const [id, det] of deterministic) {
    const modelRow = byId.get(id);
    rows.push({
      id,
      name: det.name,
      priceLabel: det.priceLabel,
      source: det.source,
      location: det.location,
      bestFor: modelRow ? sanitizeReason(modelRow.bestFor) : null,
      keyStrength: modelRow ? sanitizeReason(modelRow.keyStrength) : null,
      mainDrawback: modelRow ? sanitizeReason(modelRow.mainDrawback) : null,
    });
  }
  return rows;
}

/** "Lekki, Lagos · 3.2km away" — built only from fields that are actually
 *  set, so a nationwide match with no coordinate says where it is without
 *  implying a distance nobody measured. Null when nothing real is known. */
function locationLabel(
  area: string | null,
  state: string | null,
  distanceKm: number | null,
): string | null {
  const place = [area, state].filter(Boolean).join(", ");
  const distance = distanceKm != null ? `${distanceKm}km away` : null;
  const parts = [place || null, distance].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** The buyer-facing price string for a row. Uses the same `fmt` the cards
 *  themselves use, so the table and the card below it never disagree about
 *  how the same number is written. */
function priceLabelFor(match: VendorMatch): string {
  if (match.quoteOnRequest) return "Ask for price";
  const symbol = match.currency === "USD" ? "$" : "₦";
  const range =
    match.priceMax != null && match.priceMax > match.price
      ? `–${fmt(match.priceMax, "")}`
      : "";
  return `${fmt(match.price, symbol)}${range}`;
}

/** A STORE's price, taken from that vendor's own matching listings — the
 *  closest thing a service provider has to one, and real data the buyer can
 *  already see on their card. "from ₦X" once more than one listing carries a
 *  price, since the cheapest is a floor rather than the price of any single
 *  named thing. Falls back to the honest "Quote on request" — never a
 *  fabricated figure. */
function storePriceLabel(services: VendorMatch[]): string {
  const priced = services.filter((s) => !s.quoteOnRequest && s.price > 0);
  if (!priced.length) return "Quote on request";
  const cheapest = priced.reduce((a, b) => (b.price < a.price ? b : a));
  const symbol = cheapest.currency === "USD" ? "$" : "₦";
  const label = fmt(cheapest.price, symbol);
  return priced.length > 1 ? `from ${label}` : label;
}

const VELTE_TEMPLATE_SYSTEM_PROMPT = [
  "You build a full shopping comparison for a buyer on Velte, a Nigerian vendor-discovery service, who is explicitly comparing options (either they picked the Compare tool, or their own words unmistakably asked to weigh options against each other).",
  "You get the buyer's request and a JSON list of candidate products/services that already matched it.",
  "",
  "First check whether these candidates are genuinely what the buyer named — for ANY kind of item, not just vehicles. If they searched for something specific and no candidate is actually that thing, say so plainly in substitutionNote: what you could not find, and what you are comparing instead. This covers several shapes of gap, all worth catching: a named model that DOES NOT EXIST at all ('Lexus Jeep' — Lexus makes no vehicle called that), a real, specific model that exists but simply wasn't among the candidates found ('iPhone 17 Pro Max' asked for, only 16 Pro Max models turned up), or a specific request quietly widened to a broader category (a named phone brand answered with a mix of unrelated brands). Never silently swap in different models/items and let the table speak for itself; a buyer who asked for X and is shown Y and Z deserves to be told that up front, not left to notice on their own.",
  "Then decide the CRITERIA — what actually matters for THIS request, from the buyer's own words and what the candidates genuinely differ on. Never a fixed list: a 'cheapest X' ask weighs price heavily; a 'best for video' ask weighs performance and features instead.",
  "Then judge, for every candidate, its best-for angle, its strongest real point, and its main real drawback — all from the data given, never invented.",
  "Then pick: the best overall fit, the smartest value (or null if none stands out or the same as best overall), and — only if a genuinely different axis matters here — a third, DYNAMICALLY labeled pick (e.g. 'Best for video', 'Fastest available').",
  "Flag one real tradeoff if a tempting candidate has a genuine catch.",
  "Write a short, personalized recommendation paragraph, and up to 3 'choose X if…' lines for buyers who'd want a different pick than your top one.",
  "",
  "Each candidate carries a `sellerInfo` block (completeness, photo/detail counts, whether reachable). This is real data — use it, but never call a seller verified, trusted, rated, reviewed, official or established; `hasContact: true` only means a contact exists.",
  "Judge everything ONLY from the data given — never invent capability, stock, or quality a candidate's own fields don't show.",
  "",
  "Call the compareTemplate tool exactly once with your full comparison.",
].join("\n");

const EXTERNAL_TEMPLATE_SYSTEM_PROMPT = [
  "You build a full shopping comparison for a buyer on Velte, a Nigerian vendor-discovery service, who is explicitly comparing options (either they picked the Compare tool, or their own words unmistakably asked to weigh options against each other).",
  "Velte itself had no vendor for this request, so these are OFF-PLATFORM listings from ordinary online shops — the buyer would be buying from those shops directly, not through Velte.",
  "You get the buyer's request and a JSON list of listings, each with a title, the price as the shop displayed it, the shop's name, its own description where published, an `attributes` object of real spec pairs the page itself published (null when none, which is normal), and how many photos you were given. The photos follow, each labelled with the listing number it belongs to — the SAME item from different angles, not different items.",
  "",
  "First check whether these listings are genuinely what the buyer named — for ANY kind of item, not just vehicles. Online listings are keyword search results, not exact matches: what you were given is the closest real thing a search turned up, not necessarily the thing itself. This shows up in a few different ways worth catching — a named model that does not exist at all (e.g. 'Lexus Jeep' — Lexus makes no vehicle called that; the buyer means a Lexus SUV), a real specific model that simply wasn't among what came back (asked for an 'iPhone 17 Pro Max', only iPhone 16 models turned up), or a broad keyword match that pulled in a wider spread of items than the buyer actually meant. When any of that is true, say so plainly in substitutionNote — what could not be found, and what you are showing instead, in the buyer's own words — e.g. \"I couldn't find an exact 'Lexus Jeep 2026' listing, so I've compared the closest Lexus SUVs instead,\" or \"No iPhone 17 Pro Max listings came up, so these are the closest current iPhone models.\" A buyer who asked for one specific thing and is shown several different ones deserves to be told that up front, not left to work it out from a table of unfamiliar model names.",
  "Then decide the CRITERIA that matter for THIS request, from the buyer's own words and what the listings actually differ on.",
  "LOOK AT EVERY PHOTO BEFORE JUDGING. Sellers lead with their most flattering shot — damage shows up later: a cracked or shattered screen, a deep scratch or dent, a missing part, heavy wear, an item clearly used when sold as new. Name what you actually saw and which photo it was in; never invent a concern the photos don't show, and never call a listing's own claimed condition ('no cracks', 'grade A') fact rather than the seller's own words — where a photo disagrees, believe the photo.",
  "Judge, for every listing, its best-for angle, its strongest real point, and its main real drawback, all from the data and photos given.",
  "Then pick the best overall fit and, only if genuinely warranted, a third dynamically-labeled pick. Do NOT pick a best-value listing yourself: that is computed from the prices separately, so pass null for bestValueId/bestValueReason.",
  "Flag one real tradeoff if a tempting listing has a genuine catch. Write a short, personalized recommendation paragraph, and up to 3 'choose X if…' lines.",
  "",
  "You know nothing about delivery, stock, warranty, authenticity, or how good any of these shops are — never imply otherwise, never call a shop trusted, verified, official, reputable or reliable. Keep the lead-in honest that these are not Velte vendors.",
  "",
  "Call the compareTemplate tool exactly once with your full comparison.",
].join("\n");

/**
 * The full compare-turn template over Velte's own results. Same contract as
 * recommendResults.ts's pickRecommendation: never throws, null on any
 * failure or on fewer than 2 candidates, and every id is verified against
 * the real candidate set before it can reach the buyer.
 */
export async function buildVelteComparisonTemplate(params: {
  query: string;
  products: VendorMatch[];
}): Promise<ComparisonTemplate | null> {
  const { query, products } = params;
  if (products.length < 2) return null;

  let nearestId: string | null = null;
  let nearestKm = Infinity;
  for (const p of products) {
    if (p.distanceKm != null && p.distanceKm < nearestKm) {
      nearestKm = p.distanceKm;
      nearestId = p.productId;
    }
  }

  const candidates = products.slice(0, MAX_COMPARISON_ROWS);
  const candidateIds = candidates.map((c) => c.productId);
  const deterministic = new Map<string, DeterministicRow>(
    candidates.map((c) => [
      c.productId,
      {
        name: c.name,
        priceLabel: priceLabelFor(c),
        source: "velte" as const,
        location: locationLabel(c.area, c.state, c.distanceKm),
      },
    ]),
  );

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: VELTE_TEMPLATE_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Buyer's request: "${query}"\n\nCandidates:\n${JSON.stringify(candidates.map(candidateSummary), null, 2)}`,
            },
          ],
          tools: { compareTemplate: compareTemplateTool(candidateIds) },
          toolChoice: "required",
        },
        ["openai", "groq"],
        "compare-template-velte",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("comparison template timed out")),
          TEMPLATE_TIMEOUT_MS,
        ),
      ),
    ]);

    const verdict = result.toolResults.find(
      (r) => r.toolName === "compareTemplate",
    )?.output as CompareTemplateVerdict | undefined;
    if (!verdict) return null;

    const validIds = new Set(candidateIds);
    const bestOverallId = validIds.has(verdict.bestOverallId)
      ? verdict.bestOverallId
      : null;
    if (!bestOverallId) return null;

    let bestValueId =
      verdict.bestValueId && validIds.has(verdict.bestValueId)
        ? verdict.bestValueId
        : null;
    if (bestValueId === bestOverallId) bestValueId = null;

    let thirdPickId =
      verdict.thirdPickId && validIds.has(verdict.thirdPickId)
        ? verdict.thirdPickId
        : null;
    if (thirdPickId === bestOverallId || thirdPickId === bestValueId) {
      thirdPickId = null;
    }
    const thirdPickLabel = thirdPickId
      ? sanitizeReason(verdict.thirdPickLabel)
      : null;
    const thirdPickReason = thirdPickId
      ? sanitizeReason(verdict.thirdPickReason)
      : null;

    const byId = new Map(candidates.map((p) => [p.productId, p]));
    const tradeoffCandidate =
      verdict.tradeoffId && verdict.tradeoffId !== bestOverallId
        ? byId.get(verdict.tradeoffId)
        : undefined;
    const tradeoffNote = tradeoffCandidate
      ? sanitizeReason(verdict.tradeoffNote)
      : null;
    const topPick = byId.get(bestOverallId);
    const tradeoffIsReal =
      Boolean(tradeoffCandidate) &&
      Boolean(tradeoffNote) &&
      (!topPick || differsMeaningfully(tradeoffCandidate!, topPick));

    return {
      leadIn: sanitizeReason(verdict.leadIn),
      substitutionNote: sanitizeReason(verdict.substitutionNote),
      bestOverallId,
      bestOverallReason: sanitizeReason(verdict.bestOverallReason),
      bestValueId,
      bestValueReason: bestValueId
        ? sanitizeReason(verdict.bestValueReason)
        : null,
      nearestId,
      tradeoff:
        tradeoffIsReal && tradeoffCandidate && tradeoffNote
          ? { productId: tradeoffCandidate.productId, note: tradeoffNote }
          : null,
      criteria: sanitizeCriteria(verdict.criteria),
      rows: buildRows(verdict.rows, deterministic),
      thirdPickLabel: thirdPickId && thirdPickLabel ? thirdPickLabel : null,
      thirdPickId: thirdPickId && thirdPickLabel ? thirdPickId : null,
      thirdPickReason: thirdPickId && thirdPickLabel ? thirdPickReason : null,
      recommendationNote: sanitizeReason(
        verdict.recommendationNote,
        MAX_RECOMMENDATION_LENGTH,
      ),
      guidance: sanitizeGuidance(verdict.guidance, validIds),
    };
  } catch (err) {
    console.error(
      "[search] Velte comparison template failed, falling back to plain cards:",
      err,
    );
    return null;
  }
}

/**
 * The full compare-turn template over off-Velte offers (a dead-end turn).
 * Same contract as pickExternalRecommendation: bestValueId is code-computed
 * from prices, never asked of the model.
 */
export async function buildExternalComparisonTemplate(params: {
  query: string;
  offers: ExternalOffer[];
}): Promise<ComparisonTemplate | null> {
  const { query, offers } = params;
  if (offers.length < 2) return null;

  const candidates = offers.slice(0, MAX_COMPARISON_ROWS);
  const candidateIds = candidates.map((o) => o.id);
  const deterministic = new Map<string, DeterministicRow>(
    candidates.map((o) => [
      o.id,
      {
        name: o.title,
        priceLabel: o.priceText ?? "Not shown",
        source: "external" as const,
        // An online listing has no place and no distance — the same reason
        // pickExternalRecommendation never returns a nearestId.
        location: null,
      },
    ]),
  );

  const priced = candidates
    .map((o) => ({ offer: o, value: parseOfferPrice(o.priceText) }))
    .filter(
      (p): p is { offer: ExternalOffer; value: number } => p.value != null,
    );
  let cheapestId: string | null = null;
  if (priced.length >= 2) {
    const sorted = [...priced].sort((a, b) => a.value - b.value);
    if (sorted[0].value < sorted[1].value) cheapestId = sorted[0].offer.id;
  }

  const photosByOffer = collectOfferPhotos(candidates);
  const content: UserContent = [];
  content.push({
    type: "text",
    text: `Buyer's request: "${query}"\n\nOnline listings:\n${JSON.stringify(
      candidates.map((o) =>
        offerSummary(o, photosByOffer.get(o.id)?.length ?? 0),
      ),
      null,
      2,
    )}`,
  });

  let imageCount = 0;
  for (const [index, offer] of candidates.entries()) {
    const photos = photosByOffer.get(offer.id) ?? [];
    for (const [photoIndex, photo] of photos.entries()) {
      let url: URL;
      try {
        url = new URL(photo);
      } catch {
        continue;
      }
      content.push({
        type: "text",
        text: `Listing ${index + 1} ("${offer.title.slice(0, 60)}") — photo ${
          photoIndex + 1
        } of ${photos.length}:`,
      });
      content.push({ type: "file", mediaType: "image", data: url });
      imageCount += 1;
    }
  }

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: EXTERNAL_TEMPLATE_SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
          tools: { compareTemplate: compareTemplateTool(candidateIds) },
          toolChoice: "required",
        },
        imageCount > 0 ? ["openai"] : ["openai", "groq"],
        "compare-template-external",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("external comparison template timed out")),
          EXTERNAL_TEMPLATE_TIMEOUT_MS,
        ),
      ),
    ]);

    const verdict = result.toolResults.find(
      (r) => r.toolName === "compareTemplate",
    )?.output as CompareTemplateVerdict | undefined;

    const validIds = new Set(candidateIds);

    // The model failed but the arithmetic didn't — same "code half survives"
    // rule as pickExternalRecommendation, sized down to what's still
    // honestly available with no model verdict at all: a bare price-sorted
    // row set and nothing else.
    if (!verdict) {
      if (!cheapestId) return null;
      return {
        leadIn: null,
        substitutionNote: null,
        bestOverallId: null,
        bestOverallReason: null,
        bestValueId: cheapestId,
        bestValueReason: "Lowest price of the listings shown.",
        nearestId: null,
        tradeoff: null,
        criteria: ["price"],
        rows: buildRows(undefined, deterministic),
        thirdPickLabel: null,
        thirdPickId: null,
        thirdPickReason: null,
        recommendationNote: null,
        guidance: [],
      };
    }

    const bestOverallId = validIds.has(verdict.bestOverallId)
      ? verdict.bestOverallId
      : null;
    if (!bestOverallId) return null;

    let thirdPickId =
      verdict.thirdPickId && validIds.has(verdict.thirdPickId)
        ? verdict.thirdPickId
        : null;
    if (thirdPickId === bestOverallId || thirdPickId === cheapestId) {
      thirdPickId = null;
    }
    const thirdPickLabel = thirdPickId
      ? sanitizeReason(verdict.thirdPickLabel)
      : null;
    const thirdPickReason = thirdPickId
      ? sanitizeReason(verdict.thirdPickReason)
      : null;

    const byId = new Map(candidates.map((o) => [o.id, o]));
    const tradeoffCandidate =
      verdict.tradeoffId && verdict.tradeoffId !== bestOverallId
        ? byId.get(verdict.tradeoffId)
        : undefined;
    const tradeoffNote = tradeoffCandidate
      ? sanitizeReason(verdict.tradeoffNote)
      : null;
    const topPick = byId.get(bestOverallId);
    const tradeoffIsReal =
      Boolean(tradeoffCandidate) &&
      Boolean(tradeoffNote) &&
      (!topPick || offersDiffer(tradeoffCandidate!, topPick));

    // Same rule as pickExternalRecommendation: the cheapest listing also
    // being the best fit is the ordinary case, not two findings.
    const bestValueId = cheapestId === bestOverallId ? null : cheapestId;

    return {
      leadIn: sanitizeReason(verdict.leadIn),
      substitutionNote: sanitizeReason(verdict.substitutionNote),
      bestOverallId,
      bestOverallReason: sanitizeReason(verdict.bestOverallReason),
      bestValueId,
      bestValueReason: bestValueId
        ? "Lowest price of the listings shown."
        : null,
      nearestId: null,
      tradeoff:
        tradeoffIsReal && tradeoffCandidate && tradeoffNote
          ? { productId: tradeoffCandidate.id, note: tradeoffNote }
          : null,
      criteria: sanitizeCriteria(verdict.criteria),
      rows: buildRows(verdict.rows, deterministic),
      thirdPickLabel: thirdPickId && thirdPickLabel ? thirdPickLabel : null,
      thirdPickId: thirdPickId && thirdPickLabel ? thirdPickId : null,
      thirdPickReason: thirdPickId && thirdPickLabel ? thirdPickReason : null,
      recommendationNote: sanitizeReason(
        verdict.recommendationNote,
        MAX_RECOMMENDATION_LENGTH,
      ),
      guidance: sanitizeGuidance(verdict.guidance, validIds),
    };
  } catch (err) {
    console.error(
      "[search] external comparison template failed, falling back:",
      err,
    );
    if (!cheapestId) return null;
    return {
      leadIn: null,
      substitutionNote: null,
      bestOverallId: null,
      bestOverallReason: null,
      bestValueId: cheapestId,
      bestValueReason: "Lowest price of the listings shown.",
      nearestId: null,
      tradeoff: null,
      criteria: ["price"],
      rows: buildRows(undefined, deterministic),
      thirdPickLabel: null,
      thirdPickId: null,
      thirdPickReason: null,
      recommendationNote: null,
      guidance: [],
    };
  }
}

// ---------------------------------------------------------------------
// The same engine over SERVICE PROVIDERS / stores (2026-09-05).
//
// The design doc this file implements is explicit that products and
// services run through ONE comparison engine, and its own worked example is
// "compare wedding photographers in Port Harcourt" — a searchStores turn.
// Before this, that request got no comparison at all: both builders above
// only ever ran over searchProducts results or external offers, so the
// entire vendor/service-provider half of Velte — every tailor, mechanic,
// caterer, photographer and electrician found by store rather than by
// listing — fell straight through to a plain card carousel.
//
// The ENGINE is identical (same tool, same schema, same sanitizing, same id
// verification); only the candidate summary differs, because what a store
// honestly carries differs from what a product does. What a store has that
// is real: its own description, its sectors, where it is, how far, how many
// photos it has actually uploaded (a portfolio, for the photographer case),
// whether it is reachable, and its own matching listings — which is where
// its only real PRICE comes from.
//
// What a store does NOT have, and must never be judged on: reviews,
// ratings, verification, reputation, years in business, availability. Velte
// stores none of it. The prompt below says so in as many words, for the
// same reason recommendResults.ts's own does.
// ---------------------------------------------------------------------

const MAX_LISTINGS_PER_STORE = 4;

function storeSummary(store: StoreMatch, services: VendorMatch[]) {
  return {
    id: store.storeId,
    name: store.name,
    description: store.description ? store.description.slice(0, 220) : null,
    sectors: store.sectors,
    area: store.area,
    state: store.state,
    distanceKm: store.distanceKm,
    // The vendor's OWN matching listings — a service provider's only real
    // price, and the closest thing they have to a "what's included".
    listings: services.slice(0, MAX_LISTINGS_PER_STORE).map((s) => ({
      name: s.name,
      price: s.quoteOnRequest
        ? "quote on request"
        : `${s.currency} ${s.price}${s.priceMax != null && s.priceMax > s.price ? `–${s.priceMax}` : ""}`,
      description: s.description ? s.description.slice(0, 140) : null,
    })),
    // Their uploaded gallery — for a photographer, tailor or caterer this
    // IS the portfolio, which is why it's worth giving the model as a
    // count. A count only: judging the work itself would need the images.
    photoCount: store.gallery.length,
    hasContact: Boolean(store.whatsapp),
    relevanceScore: store.score,
  };
}

/** Do two stores differ in anything a buyer could act on? The store
 *  analogue of differsMeaningfully — used to verify a claimed tradeoff has
 *  something real behind it before it can reach the buyer. */
function storesDiffer(a: StoreMatch, b: StoreMatch): boolean {
  return (
    a.name.trim().toLowerCase() !== b.name.trim().toLowerCase() ||
    a.description !== b.description ||
    a.area !== b.area ||
    a.state !== b.state ||
    a.distanceKm !== b.distanceKm ||
    a.gallery.length !== b.gallery.length ||
    Boolean(a.whatsapp) !== Boolean(b.whatsapp) ||
    a.sectors.join("|") !== b.sectors.join("|")
  );
}

const STORE_TEMPLATE_SYSTEM_PROMPT = [
  "You build a full comparison of SERVICE PROVIDERS / businesses for a buyer on Velte, a Nigerian vendor-discovery service, who is explicitly comparing options (either they picked the Compare tool, or their own words unmistakably asked to weigh options against each other).",
  "You get the buyer's request and a JSON list of Velte vendors that already matched it. Each carries the vendor's own store description, their sector tags, where they are and how far, how many photos they have uploaded, whether they are reachable, and any of their own listings that matched the request (with prices where they set one).",
  "",
  "First check whether these vendors genuinely offer what the buyer named — for ANY kind of service, not just one category. If they asked for something specific and a vendor only matches more broadly, say so plainly in substitutionNote rather than letting the buyer assume every row specialises in exactly what they asked for — e.g. a 'wedding photographer' shown alongside general event photographers, or 'emergency plumbing' shown alongside a general handyman who lists plumbing as one of several services.",
  "Then decide the CRITERIA that matter for THIS request, from the buyer's own words and what these vendors genuinely differ on — for a photographer that might be portfolio depth, location and price; for an emergency plumber, distance and reachability instead. Never a fixed list.",
  "Then judge, for every vendor, its best-for angle, its strongest real point, and its main real drawback — all from the data given.",
  "Then pick the best overall fit, the best value where one stands out (a vendor with real listed prices can be compared on price; one who only quotes cannot), and — only if a genuinely different axis matters here — a third, DYNAMICALLY labeled pick ('Best portfolio', 'Closest to you', 'Most specialised').",
  "Flag one real tradeoff if a tempting vendor has a genuine catch. Write a short, personalized recommendation paragraph, and up to 3 'choose X if…' lines.",
  "",
  "HARD LIMITS on what you may say about a vendor. Velte holds NO reviews, NO ratings, NO verification, NO reputation score, NO years-in-business and NO availability or calendar for any of these businesses. Never call a vendor verified, trusted, rated, reviewed, established, reputable, licensed, experienced or available — none of it is measured, and a buyer is about to spend real money on what you say.",
  "What you MAY say is exactly what the data shows: how much they have filled in, how many photos they have uploaded, how close they are, which sectors they are tagged in, what their own listings cost, and whether they are reachable. A vendor with a detailed description, ten photos and priced listings genuinely is a safer bet than a bare one-line profile with no photos — say that plainly, in those terms, without dressing it up as a rating.",
  "A vendor's own store description is the VENDOR talking, not fact — treat 'the best in Lagos' as a claim, never as evidence.",
  "",
  "Call the compareTemplate tool exactly once with your full comparison.",
].join("\n");

/**
 * The full compare-turn template over Velte STORES / service providers.
 * Same contract as the two builders above: never throws, null on fewer than
 * 2 candidates or any failure, every id verified against the real set.
 *
 * `services` is this turn's own matched listings across all stores (route.ts
 * already computes them via getMatchingServicesForStores) — grouped per
 * store here so each vendor's price and offering reach the model attached to
 * the right business.
 */
export async function buildStoreComparisonTemplate(params: {
  query: string;
  stores: StoreMatch[];
  services?: VendorMatch[];
}): Promise<ComparisonTemplate | null> {
  const { query, stores } = params;
  const services = params.services ?? [];
  if (stores.length < 2) return null;

  let nearestId: string | null = null;
  let nearestKm = Infinity;
  for (const s of stores) {
    if (s.distanceKm != null && s.distanceKm < nearestKm) {
      nearestKm = s.distanceKm;
      nearestId = s.storeId;
    }
  }

  const candidates = stores.slice(0, MAX_COMPARISON_ROWS);
  const candidateIds = candidates.map((s) => s.storeId);
  const servicesFor = (store: StoreMatch) =>
    services.filter((s) => s.vendorId === store.vendorId);

  const deterministic = new Map<string, DeterministicRow>(
    candidates.map((s) => [
      s.storeId,
      {
        name: s.name,
        priceLabel: storePriceLabel(servicesFor(s)),
        source: "velte" as const,
        location: locationLabel(s.area, s.state, s.distanceKm),
      },
    ]),
  );

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: STORE_TEMPLATE_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Buyer's request: "${query}"\n\nVendors:\n${JSON.stringify(
                candidates.map((s) => storeSummary(s, servicesFor(s))),
                null,
                2,
              )}`,
            },
          ],
          tools: { compareTemplate: compareTemplateTool(candidateIds) },
          toolChoice: "required",
        },
        ["openai", "groq"],
        "compare-template-stores",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("store comparison template timed out")),
          TEMPLATE_TIMEOUT_MS,
        ),
      ),
    ]);

    const verdict = result.toolResults.find(
      (r) => r.toolName === "compareTemplate",
    )?.output as CompareTemplateVerdict | undefined;
    if (!verdict) return null;

    const validIds = new Set(candidateIds);
    const bestOverallId = validIds.has(verdict.bestOverallId)
      ? verdict.bestOverallId
      : null;
    if (!bestOverallId) return null;

    let bestValueId =
      verdict.bestValueId && validIds.has(verdict.bestValueId)
        ? verdict.bestValueId
        : null;
    if (bestValueId === bestOverallId) bestValueId = null;

    let thirdPickId =
      verdict.thirdPickId && validIds.has(verdict.thirdPickId)
        ? verdict.thirdPickId
        : null;
    if (thirdPickId === bestOverallId || thirdPickId === bestValueId) {
      thirdPickId = null;
    }
    const thirdPickLabel = thirdPickId
      ? sanitizeReason(verdict.thirdPickLabel)
      : null;
    const thirdPickReason = thirdPickId
      ? sanitizeReason(verdict.thirdPickReason)
      : null;

    const byId = new Map(candidates.map((s) => [s.storeId, s]));
    const tradeoffCandidate =
      verdict.tradeoffId && verdict.tradeoffId !== bestOverallId
        ? byId.get(verdict.tradeoffId)
        : undefined;
    const tradeoffNote = tradeoffCandidate
      ? sanitizeReason(verdict.tradeoffNote)
      : null;
    const topPick = byId.get(bestOverallId);
    const tradeoffIsReal =
      Boolean(tradeoffCandidate) &&
      Boolean(tradeoffNote) &&
      (!topPick || storesDiffer(tradeoffCandidate!, topPick));

    return {
      leadIn: sanitizeReason(verdict.leadIn),
      substitutionNote: sanitizeReason(verdict.substitutionNote),
      bestOverallId,
      bestOverallReason: sanitizeReason(verdict.bestOverallReason),
      bestValueId,
      bestValueReason: bestValueId
        ? sanitizeReason(verdict.bestValueReason)
        : null,
      nearestId,
      tradeoff:
        tradeoffIsReal && tradeoffCandidate && tradeoffNote
          ? { productId: tradeoffCandidate.storeId, note: tradeoffNote }
          : null,
      criteria: sanitizeCriteria(verdict.criteria),
      rows: buildRows(verdict.rows, deterministic),
      thirdPickLabel: thirdPickId && thirdPickLabel ? thirdPickLabel : null,
      thirdPickId: thirdPickId && thirdPickLabel ? thirdPickId : null,
      thirdPickReason: thirdPickId && thirdPickLabel ? thirdPickReason : null,
      recommendationNote: sanitizeReason(
        verdict.recommendationNote,
        MAX_RECOMMENDATION_LENGTH,
      ),
      guidance: sanitizeGuidance(verdict.guidance, validIds),
    };
  } catch (err) {
    console.error(
      "[search] store comparison template failed, falling back to plain cards:",
      err,
    );
    return null;
  }
}
