import { tool } from "ai";
import { z } from "zod";
import type { ModelMessage, UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import type { ExternalOffer, VendorMatch } from "@/types/search";

// ---------------------------------------------------------------------
// Match verification — "is this listing actually the thing that was asked
// for?", judged from the listing's own PHOTO, not just its words.
//
// Reported live (2026-08-26) on "Size 42, any brand, I just want a
// corporate shoe": retrieval returned "UrbanFlex White Sneakers — clean
// stylish everyday sneakers designed for casual wear", the turn rendered
// it under "Similar options", and the reply called it "a similar
// corporate-style shoe". The buyer had to correct it themselves: "This is
// a sneakers, what I want is a shoe."
//
// Nothing in the pipeline was wrong on its own terms. Embedding similarity
// puts sneakers very close to shoes — that is what semantic search DOES —
// and matchQuality had honestly tagged the result "similar" rather than
// "direct". The gap is that no stage ever asked the one question a human
// asks in half a second with the photo in front of them: is this even the
// right KIND of item? Every downstream layer (the reply, the status line,
// the comparison picks) then inherited a candidate that should never have
// been in the set, and each one described it in good faith.
//
// So this runs between retrieval and everything else, inside
// searchProductsCore — deliberately BEFORE the model sees the tool result,
// which is the only placement that actually fixes the reported bug: the
// reply text is written by the main tool loop from what searchProducts
// returned, so a candidate filtered anywhere later is still narrated as if
// it were there. Filter at the source and the whole turn — status phrasing,
// reply, recommendation picks, the dead-end/reach-out fallback — follows
// correctly with no other change.
//
// It does NOT run on every search: searchProductsCore gates it to a
// "similar" match quality (and route.ts gates the offer twin to a dead-end
// turn), because this is a blocking round trip that also fetches images.
// See that gate's own comment for the trade-off it makes.
//
// The division of labor is the same one recommendResults.ts states: the
// MODEL judges kind-of-item fit (a genuinely visual, open-ended judgment no
// keyword rule generalizes to — "this fix should cut across for any product
// at all" was the explicit requirement), and CODE decides what happens:
// verdicts are mapped back by verified index, only an explicit `mismatch`
// carrying a named actual item is ever dropped, and every failure path —
// provider error, timeout, unparseable output — keeps the full result set
// exactly as retrieval returned it. This layer can only ever REMOVE a wrong
// answer; it can never invent, reorder, or re-rank one.
//
// TWO surfaces use it, and deliberately only two (see the scope note above
// verifyOfferMatches for the third that does NOT):
//   - verifyItemMatches — Velte's own product/service results.
//   - verifyOfferMatches — the off-Velte online offers a dead-end turn
//     falls back to.
// ---------------------------------------------------------------------

// Same reasoning as recommendResults' own cap: the buyer is already
// watching a status line by the time this runs, so a hung provider must not
// eat into the route's 60s budget. A little longer than the comparison
// call's 8s because this one may be fetching several listing images.
const VERIFY_TIMEOUT_MS = 9000;

// Candidates past this point are left unverified rather than dropped —
// both callers pass far fewer in practice (a results page plus at most 2
// weak matches; at most 6 external offers), and an image-per-candidate call
// has to have some ceiling.
const MAX_CANDIDATES = 10;

// Clipped hard for the same reason recommendResults' candidateSummary
// clips: this is a yes/no judgment about what the item IS, and a vendor's
// full marketing copy is mostly noise for it.
const MAX_DESCRIPTION = 200;

// Vendor photos are full-resolution Cloudinary uploads, and the provider
// FETCHES each URL itself before it can answer — several megabytes of
// product photography is pure latency in front of a waiting buyer, for a
// judgment ("is this a sneaker or a formal shoe?") that a 512px thumbnail
// settles just as well. Mirrors optimizedImageUrl (src/lib/cloudinary.ts),
// with a size cap added; any non-Cloudinary URL (every external offer's
// image, for one) passes through untouched.
function thumbnailFor(url: string): string {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace("/upload/", "/upload/c_limit,w_512,f_auto,q_auto/");
}

type Verdict = "match" | "close" | "mismatch";

function verifyMatchesTool() {
  return tool({
    description:
      "Call this exactly once with one verdict for every candidate listing you were given.",
    inputSchema: z.object({
      verdicts: z.array(
        z.object({
          id: z
            .string()
            .describe(
              "The candidate's number exactly as it was labelled in the list (e.g. '1', '2').",
            ),
          verdict: z
            .enum(["match", "close", "mismatch"])
            .describe(
              "'match' — this IS the kind of item the buyer asked for. 'close' — the same kind of item differing in some detail (colour, size, brand, capacity, model, condition), OR you cannot tell from what you were given. 'mismatch' — a different KIND of item altogether, one the buyer would reject on sight.",
            ),
          actualItem: z
            .string()
            .describe(
              "A short, plain description of what this listing actually is, taken from its photo first and its words second (e.g. 'casual canvas sneakers', 'a phone case, not a phone'). Required for a 'mismatch'; a few words is enough.",
            ),
        }),
      ),
    }),
    execute: async (verdicts) => verdicts,
  });
}

// The rules are identical for both surfaces — a wrong kind of item is wrong
// wherever it came from. Only the framing differs: who wrote these
// listings, and what a wrong rejection costs. Both halves are stated
// because the model's caution should be calibrated to the real stakes, and
// they genuinely differ (a Velte vendor loses a real sale; an online offer
// is a consolation link on a turn Velte already failed).
function buildSystemPrompt(source: "velte" | "external"): string {
  const context =
    source === "velte"
      ? [
          "A buyer described something they want to buy; a semantic search returned candidate listings from real vendors on Velte. Your ONE job is to say, for each candidate, whether it is actually the kind of thing the buyer asked for.",
          "",
          "Semantic search matches on meaning, so it routinely returns near-neighbours that are the WRONG KIND OF ITEM — sneakers for a corporate shoe, a phone case for a phone, a charger for a power bank, drain cleaner for a plumber. Catching exactly that is why you exist.",
        ]
      : [
          "A buyer described something they want to buy. Velte itself had no vendor for it, so a web search fell back to listings from ordinary online shops. Your ONE job is to say, for each listing, whether it is actually the kind of thing the buyer asked for.",
          "",
          "These titles come from shop product pages and are heavily keyword-stuffed — they routinely bundle in accessories, related items, and terms the product has nothing to do with, so a title containing the buyer's words is NOT evidence on its own. A search for one thing regularly returns a different kind of thing entirely: sneakers for a corporate shoe, a case for a phone, a charger for a power bank. Catching exactly that is why you exist.",
          "",
          // route.ts builds this query from whichever tool call the turn
          // actually made, and a searchStores-only dead end hands over a
          // BUSINESS TYPE ("shoe store") rather than an item. Without this
          // line the gate inverts on exactly those turns — rejecting real
          // shoes for the crime of not being a shop.
          "The request may be phrased as a kind of SHOP rather than an item (e.g. 'shoe store', 'phone accessories store'). When it is, judge whether the listing is something that shop plainly sells: a real shoe listing for 'shoe store' is a 'match', never a 'mismatch'.",
        ];

  const stakes =
    source === "velte"
      ? "A wrong 'mismatch' deletes a real vendor's real listing from the buyer's results, so only call one when you are confident."
      : "A wrong 'mismatch' removes one of the only options left on a turn where Velte already found nothing, so only call one when you are confident.";

  return [
    "You are a quality gate on Velte, a Nigerian vendor-discovery service.",
    ...context,
    "",
    "Judge from the PHOTO first whenever one is provided. The photo is what the buyer will actually see and what the shop actually has; a listing's title and description are seller-written, often keyword-stuffed, and are the weaker evidence when the two disagree. With no photo, judge from the words alone.",
    "",
    "Rules for the verdict:",
    "- 'mismatch' ONLY when it is a different KIND of item — something the buyer would look at and say 'that isn't what I asked for at all'.",
    "- When the buyer named a specific TYPE, STYLE or PURPOSE within a broader category (a CORPORATE shoe, a GAMING laptop, a WEDDING gown, an OFFICE chair), a listing from that broad category that is plainly a different type is a 'mismatch' — the buyer named the type because the type is the point.",
    "- 'close', NOT 'mismatch', when it is the right kind of item and only the details differ: colour, size, brand, capacity, model, condition, price. Those differences are handled elsewhere and are often fine with the buyer.",
    "- 'close' whenever you genuinely cannot tell. Never guess a 'mismatch'.",
    "",
    `${stakes} Judge only what you can see and read — never infer stock, quality, or authenticity.`,
    "",
    "Give a verdict for every candidate, using the number it was labelled with. Call the verifyMatches tool exactly once.",
  ].join("\n");
}

/** One candidate reduced to what the judgment actually needs: the text
 *  block describing it, and the one photo worth looking at. */
interface JudgeCandidate {
  lines: string[];
  imageUrl: string | null;
}

/**
 * The shared half: builds the multimodal message, makes the call, and maps
 * verdicts back onto candidate INDICES. Returns the indices to reject (each
 * with what the thing actually is), or null when nothing could be judged —
 * which every caller must treat as "keep everything", never as "reject
 * everything".
 */
async function judgeCandidates(
  requestLine: string,
  candidates: JudgeCandidate[],
  source: "velte" | "external",
): Promise<Map<number, string> | null> {
  // One user message: the request, then the candidate list, then each
  // candidate's photo announced by the same number it carries in that list
  // (a bare run of images is unattributable — the label before each one is
  // what makes a per-candidate verdict possible at all).
  const content: UserContent = [];
  content.push({
    type: "text",
    text: [
      requestLine,
      "",
      `Candidate listings (${candidates.length}):`,
      candidates
        .map((c, i) =>
          [
            `${i + 1}. ${c.lines[0]}`,
            ...c.lines.slice(1).map((l) => `   ${l}`),
          ].join("\n"),
        )
        .join("\n"),
      "",
      "Any photos follow below, each labelled with its candidate number.",
    ].join("\n"),
  });

  let imageCount = 0;
  for (const [i, candidate] of candidates.entries()) {
    if (!candidate.imageUrl) continue;
    let url: URL;
    try {
      url = new URL(thumbnailFor(candidate.imageUrl));
    } catch {
      continue;
    }
    content.push({ type: "text", text: `Photo for candidate ${i + 1}:` });
    // The same non-deprecated multimodal shape route.ts uses for the
    // buyer's own photo — `ImagePart` is deprecated in this SDK version.
    content.push({ type: "file", mediaType: "image", data: url });
    imageCount += 1;
  }

  const messages: ModelMessage[] = [{ role: "user", content }];

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: buildSystemPrompt(source),
          messages,
          tools: { verifyMatches: verifyMatchesTool() },
          toolChoice: "required",
        },
        // Groq is text-only, so it's only a safe fallback when this
        // particular call carries no images at all — handing it one
        // silently misbehaves rather than failing loudly (route.ts's own
        // note on why the image path has no Groq rung).
        imageCount > 0 ? ["openai"] : ["openai", "groq"],
        "verify-matches",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("match verification timed out")),
          VERIFY_TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "verifyMatches",
    )?.output as
      | { verdicts?: { id?: string; verdict?: Verdict; actualItem?: string }[] }
      | undefined;
    const verdicts = output?.verdicts;
    if (!Array.isArray(verdicts) || !verdicts.length) return null;

    // The numbers the model returns are claims, not facts — the same
    // verification recommendResults applies to its own returned ids. A
    // number outside the candidate range is discarded rather than allowed
    // to delete the wrong listing.
    const rejected = new Map<number, string>();
    for (const v of verdicts) {
      if (v?.verdict !== "mismatch") continue;
      const index = Number.parseInt(String(v.id ?? ""), 10) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
        continue;
      }
      const actualItem =
        typeof v.actualItem === "string" ? v.actualItem.trim() : "";
      // A mismatch with nothing behind it is exactly the shape of a
      // hallucinated rejection: the verdict has to come with what the
      // thing actually IS, or it doesn't get to delete a listing.
      if (!actualItem) continue;
      rejected.set(index, actualItem.slice(0, 80));
    }
    return rejected;
  } catch (err) {
    console.error("[search] match verification failed, keeping all:", err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Velte's own results.
// ---------------------------------------------------------------------

export interface RejectedMatch {
  match: VendorMatch;
  /** What the listing actually is, in the verifier's words ("casual
   *  sneakers") — used for the note handed back to the model, and for the
   *  server log. Never rendered to the buyer directly. */
  actualItem: string;
}

export interface MatchVerification {
  kept: VendorMatch[];
  rejected: RejectedMatch[];
}

function describeRequest(product: string, attributes?: string[]): string {
  const detail = attributes?.length ? ` (${attributes.join(", ")})` : "";
  return `${product}${detail}`;
}

/**
 * Verifies that each candidate really is the kind of item the buyer asked
 * for, using the vendor's own photo as the primary evidence.
 *
 * Never throws, and never drops anything it can't justify dropping: on any
 * failure the input list comes back untouched as `kept`. Order within
 * `kept` is retrieval's own order, unchanged — this filters, it never ranks.
 */
export async function verifyItemMatches(params: {
  /** The item term the search actually ran on (searchProducts' `product`). */
  product: string;
  /** The attributes the buyer's own words named, if any. */
  attributes?: string[];
  candidates: VendorMatch[];
  /** True when the buyer's turn was a photo — worth telling the verifier,
   *  since `product` is then the model's own reading of that photo rather
   *  than the buyer's own words. */
  isImageQuery?: boolean;
}): Promise<MatchVerification> {
  const { product, attributes, candidates, isImageQuery = false } = params;
  const unchanged: MatchVerification = { kept: candidates, rejected: [] };
  if (!candidates.length || !product.trim()) return unchanged;

  const checked = candidates.slice(0, MAX_CANDIDATES);
  const unchecked = candidates.slice(MAX_CANDIDATES);

  const request = describeRequest(product, attributes);
  const requestLine = isImageQuery
    ? `The buyer sent a photo of what they want. It was read as: "${request}".`
    : `The buyer asked for: "${request}".`;

  const rejectedIndices = await judgeCandidates(
    requestLine,
    checked.map((c) => ({
      imageUrl: c.mainImageUrl,
      lines: [
        c.name,
        `kind: ${c.kind}`,
        ...(c.description
          ? [`description: ${c.description.slice(0, MAX_DESCRIPTION)}`]
          : []),
        ...(c.attributes.length
          ? [
              `details: ${c.attributes
                .slice(0, 6)
                .map((a) => `${a.name}: ${a.value}`)
                .join("; ")}`,
            ]
          : []),
      ],
    })),
    "velte",
  );
  if (!rejectedIndices?.size) return unchanged;

  const kept: VendorMatch[] = [];
  const rejected: RejectedMatch[] = [];
  checked.forEach((candidate, i) => {
    const actualItem = rejectedIndices.get(i);
    if (actualItem) rejected.push({ match: candidate, actualItem });
    else kept.push(candidate);
  });
  return { kept: [...kept, ...unchecked], rejected };
}

/**
 * The one line the MODEL is told about what was filtered. Deliberately
 * narrow: it exists so a turn that ends up empty can be honest about WHY
 * ("the closest thing on Velte was a pair of sneakers, not a corporate
 * shoe") instead of a flat "nothing found" — but it forbids offering the
 * dropped listings, since the whole point is that they were wrong. Returns
 * null when nothing was dropped, so the tool result is unchanged in the
 * ordinary case.
 */
export function rejectedMatchesNote(
  rejected: RejectedMatch[],
  requestedItem: string,
): string | null {
  if (!rejected.length) return null;
  const items = rejected.map((r) => r.actualItem).join(", ");
  return `${rejected.length} listing${rejected.length === 1 ? "" : "s"} came back from the catalog but ${rejected.length === 1 ? "was" : "were"} checked against the buyer's photo/description and ${rejected.length === 1 ? "is" : "are"} the wrong kind of item for "${requestedItem}" — actually: ${items}. ${rejected.length === 1 ? "It has" : "They have"} been removed and you must NOT offer ${rejected.length === 1 ? "it" : "them"}, mention ${rejected.length === 1 ? "its" : "their"} vendor, or describe ${rejected.length === 1 ? "it" : "them"} as an option. You MAY say plainly that the closest thing on Velte wasn't the right type (naming what it actually was) before moving on to the next step.`;
}

// ---------------------------------------------------------------------
// Off-Velte offers (2026-08-26, same day as the gate above).
//
// The same bug lives on the dead-end path, one data source over: Google
// Shopping answers "corporate shoe" with sneakers exactly as readily as a
// vector index does, and nothing filtered it. Worse, a shop title is a far
// weaker signal than a vendor's own listing — it's written for SEO, so it
// bundles in accessories and adjacent terms, and containing the buyer's
// words means very little on its own. The photo does the real work here.
//
// SCOPE NOTE — searchStores is deliberately NOT covered by any of this, per
// explicit product decision (2026-08-26). A store matched by sector is not
// claiming to have the item, and a vendor may well have it in the shop
// without ever having listed it — which is exactly what the reach-out
// offer exists to find out. Filtering stores on "does their bio mention
// this?" would delete real vendors for the crime of not writing enough
// copy, and the whole Buyer Request flow is built on the opposite premise.
// Only surfaces that show a SPECIFIC listing get gated.
// ---------------------------------------------------------------------

export interface RejectedOffer {
  offer: ExternalOffer;
  actualItem: string;
}

export interface OfferVerification {
  kept: ExternalOffer[];
  rejected: RejectedOffer[];
}

/**
 * The external-offer twin of verifyItemMatches. Same contract: never
 * throws, and any failure returns every offer untouched.
 *
 * Emptying the list entirely is a legitimate outcome — route.ts treats no
 * offers exactly as it treats a connector that found none, which is the
 * honest result when all six are the wrong product.
 */
export async function verifyOfferMatches(params: {
  /** What the dead-end search actually ran on. */
  query: string;
  offers: ExternalOffer[];
}): Promise<OfferVerification> {
  const { query, offers } = params;
  const unchanged: OfferVerification = { kept: offers, rejected: [] };
  if (!offers.length || !query.trim()) return unchanged;

  const checked = offers.slice(0, MAX_CANDIDATES);
  const unchecked = offers.slice(MAX_CANDIDATES);

  const rejectedIndices = await judgeCandidates(
    `The buyer asked for: "${query}".`,
    checked.map((o) => ({
      imageUrl: o.imageUrl,
      lines: [
        o.title,
        ...(o.merchant ? [`shop: ${o.merchant}`] : []),
        // Price is included only because a wildly-off price is real
        // evidence of a wrong KIND of item (a ₦2,500 "iPhone 15" is a
        // case, not a phone). It is never a reason to reject on its own —
        // the prompt lists price among the details that make something
        // 'close', not a mismatch.
        ...(o.priceText ? [`price: ${o.priceText}`] : []),
      ],
    })),
    "external",
  );
  if (!rejectedIndices?.size) return unchanged;

  const kept: ExternalOffer[] = [];
  const rejected: RejectedOffer[] = [];
  checked.forEach((offer, i) => {
    const actualItem = rejectedIndices.get(i);
    if (actualItem) rejected.push({ offer, actualItem });
    else kept.push(offer);
  });
  return { kept: [...kept, ...unchecked], rejected };
}
