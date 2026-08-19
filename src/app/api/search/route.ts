import { stepCountIs, type ModelMessage, type UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import { backendData } from "@/lib/server/backend";
import { aiSearchFetch } from "@/lib/server/aiSearchBackend";
import {
  searchProductsTool,
  searchProductsCore,
} from "@/lib/server/ai/searchProductsTool";
import {
  searchStoresTool,
  searchStoresCore,
} from "@/lib/server/ai/searchStoresTool";
import { getVendorProductsTool } from "@/lib/server/ai/getVendorProductsTool";
import {
  resolveSearchItem,
  type SearchItemInput,
} from "@/lib/server/ai/resolveSearchItem";
import { askClarifyingQuestionTool } from "@/lib/server/ai/askClarifyingQuestionTool";
import { createBuyerRequestTool } from "@/lib/server/ai/createBuyerRequestTool";
import { offerBuyerRequestTool } from "@/lib/server/ai/offerBuyerRequestTool";
import {
  understandingRequestPhrase,
  pickAvoiding,
  notFoundDirectlyPhrase,
  scanningVendorsPhrase,
  foundPossibleVendorPhrase,
  noVendorEvenBySectorPhrase,
  isAcknowledgementReply,
  isOfferDeclineReply,
} from "@/lib/server/ai/statusPhrases";
import {
  buildSystemPrompt,
  buildAgreementOnlySystemPrompt,
} from "@/lib/server/ai/systemPrompt";
import { getSectorClarifiers } from "@/lib/server/ai/sectorClarifiers";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import type {
  BackgroundSearchItem,
  BuyerRequestOffer,
  Clarification,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  SearchRequestBody,
  SearchStreamEvent,
  StoreMatch,
  StoreProductItem,
  VendorMatch,
} from "@/types/search";

// POST /api/search   (public — no buyer account, mirrors the public
// /store/[handle] pattern). Velte build-order step (d): each call streams a
// "staged reveal" for ONE turn — status events while the model + tool call
// are in flight (via callLLM, step (c)'s already-proven fallback-safe
// generateText call — never streamText, so a provider rate limit can never
// surface after content has already reached the client), then exactly one
// final event with that turn's complete reply + results. Plain newline-
// delimited JSON, not the Vercel AI SDK's UIMessageChunk/useChat protocol —
// that protocol carries its own server-side history/thread state, which
// this deliberately doesn't have (see `history` below).
//
// The buyer's browser can still hold a multi-turn conversation across
// several of these single-turn calls: SearchHome.tsx keeps prior turns in
// plain React state and resends their text (not images, not tool results)
// as `history` on each new call, purely so THIS turn's model call has
// context. Nothing is persisted here or on the client (no DB write, no
// localStorage) — a refresh loses it, by design.
//
// Step (e): an optional `imageUrl` is turned into a `file` content part
// (the current, non-deprecated multimodal shape — `ImagePart` is
// deprecated in this SDK version) alongside any typed text. The primary
// provider (gpt-4o-mini, multimodal — was Gemini) identifies the item
// inline and calls the same tools with its description — no separate
// identify step, no Groq fallback (it's text-only; sending it an image
// would silently misbehave rather than help).
//
// Two tools, not one: searchProducts (a specific item) and searchStores (a
// kind of business/vendor). The model's own reasoning about buyer intent
// picks the right one from their descriptions — the same mechanism that
// already correctly decides when to ask for a clarifying location instead
// of guessing. This replaced a single "searchVendors" tool that only ever
// searched products, which was itself the root of the product/vendor
// confusion.

// This app runs on Vercel — a route with no explicit maxDuration falls back
// to the platform default (10s Hobby / 15s Pro), which a single Voyage call
// alone could already exceed even before accounting for retries. A turn can
// call both searchProducts and searchStores (each internally budgeted to
// ~22s of Voyage retries via retrieval.service.js's SEARCH_DEADLINE_MS) plus
// the LLM call itself, so 60s gives real headroom for that worst case
// without assuming a plan tier beyond Hobby's own 60s hard ceiling.
export const maxDuration = 60;

function encodeEvent(event: SearchStreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

// A fallback model (Groq) can leak malformed function-call syntax directly
// into its final text instead of a real tool call or a real reply — found
// live (`<function.searchProducts({...})</function>`), distinct from the
// already-documented "calls the tool with a bad argument" failure modes.
// Never let a buyer see raw model-internal syntax.
const LEAKED_FUNCTION_CALL = /<\/?function[.=]/i;

// The system prompt above explicitly forbids restating a card's photo/link,
// but a model can still do it anyway (found live: gpt-4o-mini emitting
// `![name](cloudinary-url)` inline for every matched product) — the result
// cards already render the real photo, so a second, unrendered copy is just
// visible markdown clutter to the buyer. Strip images entirely; collapse a
// plain link down to its anchor text instead of dropping it, since that text
// is more likely to be meaningful prose than an image's alt text is.
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;
function stripRestatedMedia(text: string): string {
  return text
    .replace(MARKDOWN_IMAGE, "")
    .replace(MARKDOWN_LINK, "$1")
    .replace(/[ \t]+\n/g, "\n") // trailing whitespace left by a removed image
    .replace(/\n{3,}/g, "\n\n") // collapse blank lines left behind
    .trim();
}

// Same class of problem as LEAKED_FUNCTION_CALL below: the system prompt now
// tells the model never to write out a vendor's phone/WhatsApp number, but a
// prompt is a request, not a guarantee — found live, an assistant reply
// closing with "you can reach them via WhatsApp at +234…". The WhatsApp
// button on the card is meant to be the ONLY contact channel, so this can't
// be a surgical strip-and-continue (a mangled "reach them at ." is still a
// visible tell something's wrong) — any match nukes the whole reply, same as
// a leaked function call. Matches a run of 9-16 digits with optional +,
// spaces, or dashes between them — long enough to catch a real phone number,
// short enough to leave a price ("₦25,000") or a distance ("3.2km") alone.
const LEAKED_PHONE_NUMBER = /\+?(?:\d[\s-]?){9,16}\d/;

function sanitizeReply(text: string): string {
  const cleaned = stripRestatedMedia(text);
  if (LEAKED_FUNCTION_CALL.test(cleaned)) {
    return "Sorry, I had trouble processing that. Please try rephrasing your search.";
  }
  // Unlike a leaked function call, the search itself didn't fail — the
  // results/cards below are still real and still rendering, so the
  // replacement note has to read like a normal closing line, not an error.
  if (LEAKED_PHONE_NUMBER.test(cleaned)) {
    return "Found some options for you — take a look below and reach out using the chat button.";
  }
  return cleaned;
}

// Code-authored reply text for the agreement short-circuit's own
// createBuyerRequest call (see that block's own comment) — NOT left to the
// model's own follow-up text generation. Found live: forcing a second step
// with toolChoice:"required" (so the model could write a natural reply
// after its tool call) made it call askClarifyingQuestion a SECOND time
// instead of just writing text — the buyer would have seen both a text
// clarification prompt AND the BuyerRequestOfferWidget's own phone/OTP
// capture at once. Capping the retry at exactly one step (stepCountIs(1))
// avoids that entirely, at the cost of building this text here instead of
// letting the model phrase it — same phrasing systemPrompt.ts's own
// examples already use for each status, just picked deterministically.
function buyerRequestStatusReply(offer: BuyerRequestOffer): string {
  switch (offer.status) {
    case "created":
      return "I've reached out to a few businesses about this — if anyone's interested, they'll message you directly on WhatsApp. You'll also get an SMS confirming this went out.";
    case "needs_identity":
      return "To reach out on your behalf, I'll just need your WhatsApp number — make sure it's one vendors can actually reach you on there, since that's how they'll get back to you.";
    case "no_match":
      return "Couldn't find anyone on Velte to contact for this right now.";
    case "error":
      return "Something went wrong sending that — let me know and I'll try again.";
  }
}

// A buyer asking "where can I find this" (photo or text) wants both the item
// AND who sells it — the product card already carries the vendor's name/
// contact, but not their actual storefront (description, sectors, other
// offerings). This is a plain lookup by vendorId, deliberately NOT a
// searchStores tool call: the model never decides whether to fetch it, so it
// can never burn tool-call budget retrying it (see stepCountIs above). One
// entry per unique vendor already represented in `products` — best-effort,
// since a missing storefront shouldn't take down the whole search result.
async function getVendorStoresForProducts(
  products: VendorMatch[],
): Promise<StoreMatch[]> {
  const seenVendors = new Set<string>();
  const uniqueMatches = products.filter((p) => {
    if (seenVendors.has(p.vendorId)) return false;
    seenVendors.add(p.vendorId);
    return true;
  });

  const stores = await Promise.all(
    uniqueMatches.map(async (match) => {
      try {
        const store = await backendData<{
          storeId: string;
          handle: string;
          name: string;
          description: string;
          sectors: string[];
          whatsapp: string | null;
          avatar: string | null;
          gallery: string[];
        }>(`/store/by-vendor/${match.vendorId}`);
        const result: StoreMatch = {
          storeId: store.storeId,
          vendorId: match.vendorId,
          handle: store.handle,
          name: store.name,
          description: store.description,
          sectors: store.sectors,
          whatsapp: store.whatsapp,
          area: match.area,
          state: match.state,
          distanceKm: match.distanceKm,
          score: match.score,
          avatar: store.avatar,
          gallery: store.gallery,
        };
        return result;
      } catch (err) {
        console.error(
          `[search] vendor store lookup failed for ${match.vendorId}:`,
          err,
        );
        return null;
      }
    }),
  );

  return stores.filter((s): s is StoreMatch => s !== null);
}

// Cheap, no-embedding-call relevance check for getMatchingServicesForStores
// below — good enough to tell "this vendor's own service listing is about
// what the buyer asked for" from "unrelated", not a real semantic ranking.
// Common filler words are stripped so e.g. "a tailor for wedding dresses"
// doesn't just match on "a"/"for" against every listing.
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "of",
  "in",
  "on",
  "to",
  "your",
  "you",
  "i",
  "me",
  "need",
  "needs",
  "want",
  "wants",
  "looking",
  "find",
  "get",
  "near",
  "nearby",
  // Near-meaningless as a relevance signal here specifically — almost every
  // service listing's own description says "this service provides…"/"the
  // service includes…" regardless of what the service actually is, so a
  // businessType like "wedding planning services" would otherwise spuriously
  // match ANY vendor's unrelated service purely on this one generic word
  // (found live: matched a store's "Web & Mobile App development" listing to
  // a wedding-planning search, scoring 1/3 on "service" alone).
  "service",
  "services",
]);
// Light suffix stripping so word-form variants of the same idea overlap —
// e.g. a buyer asking for an "event planner" should still hit a listing
// whose description only ever says "wedding planning", not "planner". Not
// a real stemmer (Porter etc.), just enough common-suffix collapsing to
// catch gerund/agent-noun/plural mismatches without over-mangling short
// words into false matches.
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
// Fraction of the query's own (non-stopword) tokens that also appear in the
// candidate text — deliberately query-token-normalized, not candidate-
// normalized: a long service description shouldn't get penalized for
// containing lots of words the query didn't ask about.
function relevanceScore(query: string, candidateText: string): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;
  const candidateTokens = new Set(tokenize(candidateText));
  let hits = 0;
  for (const t of queryTokens) if (candidateTokens.has(t)) hits++;
  return hits / queryTokens.size;
}

// Distinguishes a genuine dual-intent turn (the buyer named TWO separate
// things — "fix my laptop screen, and also a plumber") from the ordinary
// mandatory single-item cascade (systemPrompt.ts's own rule: a zero-result
// searchProducts call MUST also try searchStores, using the model's own
// paraphrased businessType for the SAME item — "power bank" → "electronics
// store"). Both shapes produce a turn with both productCall AND storeCall
// present, so tool-call shape alone can't tell them apart — reuses this
// file's own tokenize() (already built for getMatchingServicesForStores) to
// check word overlap instead: a paraphrase of the same item shares real
// vocabulary with it ("power bank" / "power bank retailer" — real overlap);
// two actually different things typically don't ("laptop screen repair" /
// "plumber" — none). Deliberately a cheap heuristic, not a model
// self-report — a wrong call here only costs one extra background search on
// route.ts's own dime, never something the buyer pays for or notices as
// broken.
const DUAL_INTENT_MAX_OVERLAP = 0.34;
function isGenuineDualIntent(productTerm: string, storeTerm: string): boolean {
  const productTokens = new Set(tokenize(productTerm));
  const storeTokens = new Set(tokenize(storeTerm));
  if (!productTokens.size || !storeTokens.size) return false;
  let shared = 0;
  for (const t of productTokens) if (storeTokens.has(t)) shared++;
  const overlapRatio = shared / Math.min(productTokens.size, storeTokens.size);
  return overlapRatio < DUAL_INTENT_MAX_OVERLAP;
}

// Found live (2026-08-19): a genuinely two-part original message ("fix my
// laptop... and I need a plumber as well") correctly triggers the
// dual-intent branch above when sent FRESH, but on a CONTENT-FREE
// continuation turn — the buyer's actual message this turn is just
// "Shared my location" or a bare "yes", carrying no text of its own, so
// the model has to reconstruct the original need entirely from `history`
// — it reliably resolves only ONE of the two needs (verified via direct
// curl: called searchStores("plumber") alone, dropping the laptop half
// completely, even though the SAME two-part text sent as a fresh message
// calls both tools correctly). `retryDualIntentReminder` below is the
// fix; these two helpers are what decide whether it's even worth trying —
// firing an extra LLM call on every ordinary single-item continuation
// (the overwhelming majority) would be pure waste.
//
// Deliberately a cheap text heuristic, not an LLM classification — same
// tolerance as messageNamesAPlace (SearchHome.tsx): good enough to catch
// the common "X and I also need Y" phrasing this was found on, not a claim
// of exhaustive NLP-grade coverage. A false positive here only costs one
// extra background retry (never shown to the buyer as broken); a false
// negative just leaves today's known gap unfixed for that one phrasing.
const DUAL_INTENT_TEXT_PATTERN =
  /\b(?:and (?:i(?:'m| am)? )?(?:also )?need|also need|as well|and also|plus (?:a|an|i)\b|also (?:want|looking for|need))\b/i;
function lastSubstantiveUserMessage(
  history: SearchHistoryTurn[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role !== "user") continue;
    const trimmed = turn.content.trim();
    // Skip content-free continuations themselves — "Shared my location" is
    // SearchHome.tsx's own literal stand-in text (see handleLocationShared),
    // never something with a real need of its own to check.
    if (isAcknowledgementReply(trimmed) || trimmed === "Shared my location")
      continue;
    return turn.content;
  }
  return null;
}

const MAX_MATCHING_SERVICES_PER_STORE = 3;

interface PublicStoreCatalogItem {
  id: string;
  name: string;
  kind: "product" | "service";
  quoteOnRequest?: boolean;
  price: number;
  priceMax: number | null;
  currency: string;
  mainImageUrl: string | null;
  description: string | null;
}

// The reverse direction of getVendorStoresForProducts: for a searchStores
// turn, each matched vendor's OWN service listings that actually match what
// the buyer asked for — so "I need a wedding photographer in Lekki" doesn't
// just surface a matched studio's bare storefront, it surfaces the specific
// "Wedding Photography Package" listing they'd otherwise only find by
// clicking through. Reuses the existing public /store/by-handle/:handle
// catalog endpoint (same one getVendorProductsTool already calls) rather
// than a new vector-search endpoint — a cheap keyword-overlap match against
// each candidate's name and description scored separately (not a real
// embedding search, see relevanceScore above), so a listing that matches on
// both outranks one that only happens to match on either alone. Best-effort
// per store: one failed lookup never takes down the rest.
async function getMatchingServicesForStores(
  stores: StoreMatch[],
  queryText: string | null,
): Promise<VendorMatch[]> {
  if (!queryText || stores.length === 0) return [];

  const perStore = await Promise.all(
    stores.map(async (store): Promise<VendorMatch[]> => {
      try {
        const data = await backendData<{
          products: PublicStoreCatalogItem[];
        }>(`/store/by-handle/${encodeURIComponent(store.handle)}`);

        return (data.products ?? [])
          .filter((item) => item.kind === "service")
          .map((item) => {
            const nameScore = relevanceScore(queryText, item.name);
            const descriptionScore = relevanceScore(
              queryText,
              item.description ?? "",
            );
            // A listing whose description backs up its name match is a
            // stronger signal than either alone — bump it into its own tier
            // (always above any single-signal match) rather than just
            // nudging its score up by a fraction, so it reliably lands first
            // once sorted, not just "usually."
            const score =
              (nameScore > 0 && descriptionScore > 0 ? 1 : 0) +
              Math.max(nameScore, descriptionScore);
            return { item, score, nameScore, descriptionScore };
          })
          .filter(
            ({ nameScore, descriptionScore }) =>
              nameScore > 0 || descriptionScore > 0,
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MATCHING_SERVICES_PER_STORE)
          .map(
            ({ item, score }): VendorMatch => ({
              productId: item.id,
              kind: "service",
              name: item.name,
              price: item.price / 100,
              priceMax: item.priceMax != null ? item.priceMax / 100 : null,
              quoteOnRequest: Boolean(item.quoteOnRequest),
              currency: item.currency,
              mainImageUrl: item.mainImageUrl,
              // Not selected by the lightweight public-catalog endpoint this
              // reuses — a known tradeoff of the cheap-match approach over a
              // real per-listing fetch. See this function's own doc comment.
              thumbnailUrls: [],
              storeHandle: store.handle,
              description: item.description,
              attributes: [],
              vendorId: store.vendorId,
              vendorName: store.name,
              area: store.area,
              state: store.state,
              whatsapp: store.whatsapp,
              distanceKm: store.distanceKm,
              score,
            }),
          );
      } catch (err) {
        console.error(
          `[search] matching-services lookup failed for store "${store.handle}":`,
          err,
        );
        return [];
      }
    }),
  );

  return perStore.flat();
}

// Pure post-processing of one callLLM result into everything the route needs
// downstream — pulled out so a retry (see POST's "looksLikeLocationClarify"
// comment) can re-run this exact same extraction on a second model call
// without duplicating ~90 lines of tool-result parsing.
function extractOutcome(result: Awaited<ReturnType<typeof callLLM>>) {
  // askClarifyingQuestion's own tool description explicitly forbids calling
  // it alongside another tool, but gpt-4o-mini has been observed doing
  // exactly that anyway (found live: it reaches for this tool almost
  // reflexively, INCLUDING on turns where nothing was actually missing —
  // e.g. device location already known, a search that would have returned
  // real results regardless). So its presence is a candidate, not
  // automatically authoritative — the real decision (hasUsefulResults below)
  // is: did the co-called search find anything genuinely useful? If yes, a
  // spurious clarify call is ignored entirely and the real results win; only
  // a search that came back with nothing at all (or no search call happened)
  // defers to the clarification.
  const clarifyCall = result.toolCalls.findLast(
    (c) => c.toolName === "askClarifyingQuestion",
  );
  const clarifyInput = clarifyCall?.input as
    | {
        question: string;
        kind: "choice" | "text" | "location";
        options?: string[];
      }
    | undefined;
  // Downgrades a malformed "choice" (missing/too-few options) to "text"
  // server-side, so the frontend's discriminated Clarification type never
  // has to re-validate what the model actually sent. "location" passes
  // through as-is — it never has options to validate in the first place.
  const clarifyCandidate: Clarification | null = !clarifyInput
    ? null
    : clarifyInput.kind === "location"
      ? { kind: "location", question: clarifyInput.question }
      : clarifyInput.kind === "choice" &&
          (clarifyInput.options?.length ?? 0) >= 2
        ? {
            kind: "choice",
            question: clarifyInput.question,
            options: clarifyInput.options!,
          }
        : { kind: "text", question: clarifyInput.question };

  // .findLast, not .find: a fallback model (Groq) occasionally calls a tool
  // more than once for one turn — the last call is what its final reply is
  // actually synthesized from, found live during the hardening pass.
  const productCall = result.toolCalls.findLast(
    (c) => c.toolName === "searchProducts",
  );
  const storeCall = result.toolCalls.findLast(
    (c) => c.toolName === "searchStores",
  );
  const productResult = result.toolResults.findLast(
    (r) => r.toolName === "searchProducts",
  )?.output as
    | {
        results?: VendorMatch[];
        matchTier?: MatchTier;
        matchQuality?: MatchQuality;
        externalSuggestions?: NearbyBusiness[];
      }
    | undefined;
  const storeResult = result.toolResults.findLast(
    (r) => r.toolName === "searchStores",
  )?.output as
    | {
        results?: StoreMatch[];
        furtherResults?: StoreMatch[];
        matchTier?: MatchTier;
        matchQuality?: MatchQuality;
        externalSuggestions?: NearbyBusiness[];
      }
    | undefined;
  const vendorProductsResult = result.toolResults.findLast(
    (r) => r.toolName === "getVendorProducts",
  )?.output as
    | {
        results?: StoreProductItem[];
        store?: {
          name: string;
          handle: string;
          whatsapp: string | null;
          vendorId: string;
        };
      }
    | undefined;
  // createBuyerRequestTool's execute() return value IS the full
  // BuyerRequestOffer already — no reshaping needed, unlike the search
  // tools above (which return a raw retrieval-service shape).
  const buyerRequestOffer =
    (result.toolResults.findLast((r) => r.toolName === "createBuyerRequest")
      ?.output as BuyerRequestOffer | undefined) ?? null;
  // See offerBuyerRequestTool's own comment — a mechanical signal, not
  // inferred from the reply text, that this turn's reply IS the reach-out
  // offer, so route.ts/the frontend know to hold back any Google Places
  // fallback the co-called search may have already returned.
  const buyerRequestOffered = result.toolResults.some(
    (r) => r.toolName === "offerBuyerRequest",
  );
  const products = productResult?.results ?? [];
  const stores = storeResult?.results ?? [];
  const furtherStores = storeResult?.furtherResults ?? [];
  const productsMatchTier = productResult?.matchTier ?? null;
  const storesMatchTier = storeResult?.matchTier ?? null;
  const productsMatchQuality = productResult?.matchQuality;
  const storesMatchQuality = storeResult?.matchQuality;
  // What the model actually searched stores FOR this turn (e.g. "phone
  // repair shop", "tailor") — used to customize the WhatsApp pre-filled
  // message on a pure vendor/store card (no product attached) instead of the
  // generic "interested in what you offer." Only meaningful when it's the
  // sole intent, never for productStores (a real product already names
  // itself on that card).
  const storesQuery =
    (storeCall?.input as { businessType?: string } | undefined)?.businessType ??
    null;
  // Either tool can surface its own Google Places fallback (Tier 5) — a
  // dual-intent turn ("a phone repair shop that also sells white sneakers")
  // could in principle call both and get overlapping nearby businesses back
  // from each, so dedupe by placeId rather than assuming only one tool ever
  // populates this.
  const externalStoreSuggestions = Array.from(
    new Map(
      [
        ...(productResult?.externalSuggestions ?? []),
        ...(storeResult?.externalSuggestions ?? []),
      ].map((b) => [b.placeId, b]),
    ).values(),
  );
  const vendorProducts = vendorProductsResult?.results ?? [];
  const vendorProductsStore = vendorProductsResult?.store ?? null;

  // The real decision: a spurious clarify call is dropped entirely when the
  // co-called search actually found something useful — the buyer already has
  // a real, actionable answer, and a pointless question on top of it is
  // worse than the original bug of silently dropping the clarification. Only
  // defers to the clarification when the search came back with genuinely
  // nothing (or no search ran at all this turn).
  const hasUsefulResults =
    products.length > 0 ||
    stores.length > 0 ||
    vendorProducts.length > 0 ||
    externalStoreSuggestions.length > 0;
  const clarification = hasUsefulResults ? null : clarifyCandidate;

  return {
    clarifyCandidate,
    hasUsefulResults,
    clarification,
    products,
    stores,
    furtherStores,
    storesQuery,
    productsMatchTier,
    storesMatchTier,
    productsMatchQuality,
    storesMatchQuality,
    externalStoreSuggestions,
    vendorProducts,
    vendorProductsStore,
    buyerRequestOffer,
    buyerRequestOffered,
    productCall,
    storeCall,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SearchRequestBody | null;
  const message = body?.message?.trim() ?? "";
  const imageUrl = body?.imageUrl;
  // Resolved once, up front — search itself stays fully anonymous either
  // way (see this route's own top comment), this is only ever read by
  // createBuyerRequestTool to decide whether it can create the request
  // immediately or has to hand back `needs_identity` instead.
  const buyerAuth = await getOptionalBuyerAuth();

  if (!message && !imageUrl) {
    return new Response(
      JSON.stringify({
        type: "error",
        message: "message or imageUrl is required.",
      } satisfies SearchStreamEvent) + "\n",
      { status: 400, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  const content: UserContent = [];
  if (message) content.push({ type: "text", text: message });
  if (imageUrl) {
    content.push({ type: "file", mediaType: "image", data: new URL(imageUrl) });
  }
  // Prior turns are text-only (see SearchHistoryTurn) — never an image, and
  // never raw tool-call/result payloads, just what was said. Prepended
  // before the new turn's content so the model has conversational context
  // without the earlier photo(s) counting against this turn's token/attach
  // limits, and without needing to know its own past tool calls' shapes.
  const historyMessages: ModelMessage[] = (body?.history ?? []).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
  const messages: ModelMessage[] = [
    ...historyMessages,
    { role: "user", content },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Tracks the last few status lines shown (capped, most-recent-last) so
      // `push` can steer away from repeating one — both back-to-back within
      // THIS turn's own understanding → searching → found sequence (and any
      // zero-result cascade into a second tool call), AND across earlier
      // turns in the same session: this route is otherwise stateless (a
      // fresh request every turn), so seeding from the client-sent
      // `recentStatuses` (see SearchHome.tsx's shownStatusesRef) is what
      // stops the exact same line from resurfacing search after search, not
      // just push after push. Sliced to the cap up front so the existing
      // push-then-shift-by-one logic below stays correct — it assumes the
      // array starts at-or-under RECENT_STATUS_MEMORY, not arbitrarily long.
      // See pickAvoiding's own comment for why the avoidance has to live
      // here rather than inside each phrase pool.
      const RECENT_STATUS_MEMORY = 8;
      const recentStatuses: string[] = (body?.recentStatuses ?? []).slice(
        -RECENT_STATUS_MEMORY,
      );
      const push = (candidates: string[]) => {
        const text = pickAvoiding(candidates, recentStatuses);
        recentStatuses.push(text);
        if (recentStatuses.length > RECENT_STATUS_MEMORY)
          recentStatuses.shift();
        controller.enqueue(encodeEvent({ type: "status", text }));
      };

      push(understandingRequestPhrase(Boolean(imageUrl), message));

      // Populated by searchProductsTool's execute(), outside the model's own
      // return value — see that tool's weakResultsOut doc comment. Declared
      // here (not inside the tool call) since it needs to survive past
      // callLLM to build the final event below.
      const weakResultsRef: { current: VendorMatch[] } = { current: [] };

      // Computed once, server-side, before the model ever sees anything —
      // never a tool the model calls itself (see systemPrompt.ts's comment
      // on buildSystemPrompt for why). Scoped to a FRESH, text-only turn:
      // an image query already has its own identify-then-clarify path, and
      // a turn with history is a follow-up (refinement, decline, or answer
      // to a clarifying question already asked) — injecting a second sector
      // note there could re-trigger a question the one-round rule forbids.
      //
      // Also gated on buyerLocation being known: giving the model a second,
      // more "interesting" clarifying-question option (charger type, size,
      // color…) on the SAME turn location is genuinely missing turned out
      // to reliably beat the location gate in practice — a prose precedence
      // rule telling the model "location wins" wasn't enough (found live,
      // repeatable across runs). Removing the competing option outright,
      // the same fix already proven for the mirror bug below (a retry that
      // removes askClarifyingQuestion entirely rather than re-asking nicely
      // not to use it), is what actually holds. Once location IS known —
      // including from an earlier turn this session, since the client keeps
      // resending it — this reverts to computing normally.
      const sectorClarifiers =
        message && !imageUrl && !body?.history?.length && body?.buyerLocation
          ? getSectorClarifiers(message)
          : null;

      try {
        // Split out so a retry (below) can re-run the model with
        // askClarifyingQuestion removed from the tool set entirely, rather
        // than just asking it again not to — see the retry's own comment for
        // why a second plain request isn't good enough here.
        const searchTools = {
          searchProducts: searchProductsTool(
            body?.buyerLocation,
            push,
            Boolean(imageUrl),
            imageUrl,
            weakResultsRef,
          ),
          searchStores: searchStoresTool(body?.buyerLocation, push),
          getVendorProducts: getVendorProductsTool(push),
          createBuyerRequest: createBuyerRequestTool(
            buyerAuth,
            body?.buyerLocation,
            imageUrl,
            push,
          ),
          offerBuyerRequest: offerBuyerRequestTool(),
        };
        const system = buildSystemPrompt(
          Boolean(body?.buyerLocation),
          sectorClarifiers,
        );
        // Groq is text-only — never route an image query to it.
        const providerOrder: ("openai" | "groq")[] = imageUrl
          ? ["openai"]
          : ["openai", "groq"];

        // Deterministic short-circuit — don't trust the model to reliably
        // recognize "the buyer just agreed to my own earlier reach-out
        // offer" from plain history text alone, even when that text is
        // clean and unambiguous. Verified live, TWICE: a plain "yes" could
        // still make the model re-search from scratch instead of moving
        // toward createBuyerRequest — the same "don't trust the model,
        // verify/force it" class of gap the location-only retries further
        // down already exist to guard against, just for the agreement step
        // instead of the location-ask step. Second time: even after
        // forcing the "yes" step to correctly ask for a name, the buyer's
        // FOLLOW-UP reply giving their actual name (plain free text, never
        // matching any canned agreement phrase — `isOfferAgreementReply`
        // alone can't catch it) fell through the same way, running a
        // second, unrelated search as a side effect alongside the (correct)
        // createBuyerRequest call. `awaitingBuyerRequestReply`
        // (SearchHistoryTurn's own field, mirrored straight from the
        // previous turn's own structured state — see that type's own
        // comment) is what makes BOTH steps reliable: true for the OFFER
        // turn itself AND for this short-circuit's own name-ask turn, so
        // the buyer's next message — "yes," or later their actual name —
        // both correctly route back through here rather than only the
        // first one. No regex-guessing an offer from wording, which would
        // misfire on any coincidentally similar assistant reply. Skips the
        // ENTIRE normal pipeline below (including the first ordinary
        // callLLM call) — there is nothing to search here, only a name to
        // ask for or a request to create. Still requires
        // `!isOfferDeclineReply` — a decline belongs to the ORDINARY
        // pipeline's own already-correct decline handling (re-search,
        // reveal Places), not this one.
        const lastHistoryTurn = body?.history?.at(-1);
        const isAnsweringOffer =
          lastHistoryTurn?.role === "assistant" &&
          lastHistoryTurn.awaitingBuyerRequestReply === true &&
          !isOfferDeclineReply(message);

        if (isAnsweringOffer) {
          // stepCountIs(1), not 2 — capped at EXACTLY one tool call on
          // purpose (see buyerRequestStatusReply's own comment): letting
          // the model take a second step to write its own natural-language
          // reply, combined with toolChoice:"required", made it call
          // askClarifyingQuestion a second time instead of just writing
          // text — a genuine, confusing double-prompt bug found live. The
          // reply is built from the ONE tool's own result instead.
          const agreementResult = await callLLM(
            {
              system: buildAgreementOnlySystemPrompt(message),
              messages,
              tools: {
                askClarifyingQuestion: askClarifyingQuestionTool(),
                createBuyerRequest: searchTools.createBuyerRequest,
              },
              toolChoice: "required",
              stopWhen: stepCountIs(1),
            },
            providerOrder,
          );
          const agreementOutcome = extractOutcome(agreementResult);
          const agreementReply = agreementOutcome.clarification
            ? agreementOutcome.clarification.question
            : agreementOutcome.buyerRequestOffer
              ? buyerRequestStatusReply(agreementOutcome.buyerRequestOffer)
              : sanitizeReply(agreementResult.text) ||
                "Sorry, something went wrong there — let me know and I'll try again.";

          controller.enqueue(
            encodeEvent({
              type: "final",
              reply: agreementReply,
              toolCalled: false,
              clarification: agreementOutcome.clarification,
              products: [],
              weakProducts: [],
              stores: [],
              furtherStores: [],
              storesQuery: null,
              productStores: [],
              storeServices: [],
              productsMatchTier: null,
              storesMatchTier: null,
              productsMatchQuality: undefined,
              storesMatchQuality: undefined,
              externalStoreSuggestions: [],
              vendorProducts: [],
              vendorProductsStore: null,
              buyerRequestOffer: agreementOutcome.buyerRequestOffer,
              buyerRequestOffered: false,
              backgroundItem: null,
              // True only for the intermediate name-ask (still an open
              // exchange, the buyer's next reply needs routing back here
              // too) — false once createBuyerRequest actually resolved
              // (created/needs_identity/no_match/error are all terminal
              // for THIS mechanism; needs_identity hands off to
              // BuyerRequestOfferWidget's own phone/OTP flow instead,
              // which never goes through another /api/search round-trip).
              awaitingBuyerRequestReply:
                agreementOutcome.clarification !== null,
            }),
          );
          return;
        }

        let result = await callLLM(
          {
            system,
            messages,
            tools: {
              ...searchTools,
              askClarifyingQuestion: askClarifyingQuestionTool(),
            },
            // 4, not 3: a zero-match searchProducts now always falls through
            // to searchStores before the model is allowed to write its final
            // note (see the system prompt above) — call → call → text is
            // already 3 steps with zero room left for a redundant repeat call
            // (documented below as real, observed Groq behavior). That's the
            // same "no room for text" failure this budget already exists to
            // avoid, just one call deeper now that two tools chain together
            // on the common zero-match path instead of only occasionally.
            // 4 steps (call → call → possible redundant call → final text)
            // keeps a guaranteed last step for text generation.
            stopWhen: stepCountIs(4),
          },
          providerOrder,
        );
        let outcome = extractOutcome(result);

        // gpt-4o-mini has been observed asking a location clarifying question
        // even when the buyer's device location is already known and folded
        // into the prompt via locationNote — a documented reliability gap the
        // co-called-search fallback below doesn't catch on its own, since a
        // compliant model makes askClarifyingQuestion its ONLY tool call that
        // turn (per the prompt's "STOP there" rule), leaving no co-called
        // search result to fall back on. Detected by shape/content, not exact
        // text (the model paraphrases the question itself either way): either
        // the "choice" ".../search nationwide anyway" shape from searchStores'
        // own branch, OR any clarification (choice or free "text") whose
        // question is plainly asking where the buyer is — e.g. searchProducts
        // territory has no legitimate location-clarify path at all (the
        // prompt says to just search nationwide instead), so a "what
        // city/area..." question there is always this same bug, just phrased
        // as free text instead of a choice. Neither pattern collides with a
        // real sector-attribute question (color/size/budget never mention a
        // place). Retried once, with askClarifyingQuestion itself removed
        // from the tool set — a second plain request not to ask again is
        // exactly the instruction that failed the first time, so the model is
        // left with no way to repeat the mistake and must pick a real search
        // tool instead.
        const LOCATION_CLARIFY_PATTERN =
          /\b(city|area|location|located|situated|whereabouts|neighbo(?:u)?rhood|which (?:state|town)|where (?:are|do) you|part of town)\b/i;
        // Guards the two NEW "force a location ask" retries below (see
        // their own comments) — without this, a buyer who already declined
        // ("Search without sharing my location", the widget's own canned
        // decline text — see ClarificationPrompt.tsx) gets asked AGAIN on
        // this very turn, because a forced retry can't otherwise tell
        // "never asked yet" apart from "already asked, buyer said no."
        // Checking the whole history, not just the immediately-prior turn:
        // systemPrompt.ts's own rule is "don't ask again for the same need
        // EITHER way" for the rest of the conversation, not just once.
        const alreadyAskedLocationThisConversation = (body?.history ?? []).some(
          (turn) =>
            turn.role === "assistant" &&
            LOCATION_CLARIFY_PATTERN.test(turn.content),
        );
        const looksLikeLocationClarify =
          Boolean(body?.buyerLocation) &&
          Boolean(outcome.clarifyCandidate) &&
          ((outcome.clarifyCandidate!.kind === "choice" &&
            outcome.clarifyCandidate!.options.some((o) =>
              /nationwide/i.test(o),
            )) ||
            LOCATION_CLARIFY_PATTERN.test(outcome.clarifyCandidate!.question));

        // Same reliability gap, different shape: the model sometimes asks
        // about location in its own PLAIN TEXT reply without calling
        // askClarifyingQuestion (or any search tool) at all — invisible to
        // looksLikeLocationClarify above since that only inspects an actual
        // tool call. Left unchecked, this renders as a dead-end "suggestion"
        // card (see SearchHome's !turn.toolCalled branch) showing the
        // buyer their own location asked right back at them. Only fires
        // when NO search tool ran either — a real search result's closing
        // note is free to mention location without tripping this.
        const looksLikeBareLocationAsk =
          Boolean(body?.buyerLocation) &&
          !outcome.clarifyCandidate &&
          !outcome.productCall &&
          !outcome.storeCall &&
          LOCATION_CLARIFY_PATTERN.test(result.text ?? "");

        if (
          (looksLikeLocationClarify || looksLikeBareLocationAsk) &&
          !outcome.hasUsefulResults
        ) {
          // Found live (2026-08-19, a real dual-intent turn: "fix my laptop
          // ... and I need a plumber"): re-calling the model here used to be
          // unconditional, which silently DISCARDS every tool call the
          // first attempt already made — fine when nothing was searched at
          // all (the model asked instead of searching), but a genuine data
          // loss when a real search (or two, on a dual-intent turn) already
          // ran and just came back empty. Verified via curl: the first
          // attempt correctly called BOTH searchProducts("laptop repair
          // shop") and searchStores("plumber"), alongside a spurious
          // location clarify; the retry call — same messages, same
          // history — only reproduced searchStores, and productCall
          // silently vanished from `outcome`, along with half the buyer's
          // actual request. `looksLikeBareLocationAsk` already only fires
          // when NEITHER tool was called (see its own guard), so THIS
          // branch only ever needs the LLM retry for `looksLikeLocationClarify`
          // with no co-called search at all — whenever a real search
          // already ran (productCall or storeCall present), there's
          // nothing to re-derive: just drop the spurious clarify in place
          // and let the rest of the pipeline (cross-check/dead-end
          // handler/dual-intent branch) run on the outcome exactly as the
          // model already, correctly, produced it.
          if (outcome.productCall || outcome.storeCall) {
            console.warn(
              "[search] discarded a spurious location clarify alongside a real (empty) search — keeping the existing search outcome, no retry",
            );
            outcome = {
              ...outcome,
              clarification: null,
              clarifyCandidate: null,
            };
          } else {
            // Marks which path produced a given turn's result — the model
            // asking correctly the first time vs. this retry silently
            // catching a spurious ask are indistinguishable to the buyer,
            // but not distinguishing them here would make gpt-4o-mini's
            // location-asking reliability impossible to track over time.
            console.warn(
              looksLikeLocationClarify
                ? "[search] discarded a spurious location clarify (buyer location already known), no search ran — retrying without askClarifyingQuestion"
                : "[search] discarded a bare-text location ask with no tool call (buyer location already known) — retrying without askClarifyingQuestion",
            );
            result = await callLLM(
              {
                system,
                messages,
                tools: searchTools,
                stopWhen: stepCountIs(4),
              },
              providerOrder,
            );
            outcome = extractOutcome(result);

            // Found live (2026-08-19): merely removing askClarifyingQuestion
            // from the tool set isn't always enough — a plain-text reply is
            // still available regardless of the tool set, and gpt-4o-mini
            // reproduced the EXACT SAME bare-text "please share your
            // location" ask on this retry too, three times in a row via
            // direct curl, buyerLocation known the whole time. Since a
            // buyer's actual message this turn IS a real search request
            // (that's what got us into this branch at all), forcing the
            // choice — not just narrowing the options — is what actually
            // leaves the model no way to just talk instead of searching.
            // Scoped to only the two search tools (not the full
            // `searchTools`, which also has createBuyerRequest/
            // offerBuyerRequest/getVendorProducts) — nothing else is a
            // sane forced choice for a turn that's asking for something to
            // search for in the first place.
            if (!outcome.productCall && !outcome.storeCall) {
              console.warn(
                "[search] still no search tool call after the first retry — forcing one via toolChoice",
              );
              result = await callLLM(
                {
                  system,
                  messages,
                  tools: {
                    searchProducts: searchTools.searchProducts,
                    searchStores: searchTools.searchStores,
                  },
                  toolChoice: "required",
                  stopWhen: stepCountIs(4),
                },
                providerOrder,
              );
              outcome = extractOutcome(result);
            }
          }
        }

        // Mirror of the gap above, opposite direction and a NEW failure mode
        // (2026-08-16, once the "every search needs a location" gate went
        // in — see systemPrompt.ts's own comment): the buyer's location is
        // genuinely NOT known here, so SOME location ask is correct, but
        // gpt-4o-mini reliably fails to produce the right ONE in practice —
        // caught live across four distinct shapes, in order of how each fix
        // was found insufficient: (1) writing the ask as plain reply text
        // with no tool call at all, even after strengthening the prompt
        // wording twice; (2) once forced to call askClarifyingQuestion,
        // asking about a product attribute (charger type, model…) instead
        // of location, even with an explicit prose "location wins"
        // precedence rule; (3) doing that same wrong-attribute ask on its
        // own initiative, with no sectorNote in the prompt at all to blame
        // it on (route.ts now suppresses that note whenever location is
        // unknown — see its own comment — so this is the model's unprompted
        // default, not something it picked up from the sector hint); (4)
        // skipping the location gate entirely and just calling
        // searchProducts/searchStores nationwide, landing in a genuine dead
        // end it could have avoided by asking first.
        //
        // The fix that finally holds for (1)-(3): don't just force the TOOL
        // (tried that — case 2 above is what forcing alone still produced)
        // — swap the entire system prompt for the retry down to a single-
        // purpose instruction with nothing else competing for the model's
        // attention, no sector hints, no cascade rules, nothing to ask
        // about except location. `messages` (the buyer's real conversation)
        // stays as-is; only `system` shrinks. Case (4) reuses the exact
        // same retry, just triggered by a different detector below.
        async function retryLocationOnly() {
          const locationOnlySystem = `The buyer just asked: "${
            message || "(sent a photo, no caption)"
          }". Their location is unknown — neither a device location nor a named place exists for this search, and this search needs one. Call the askClarifyingQuestion tool with kind: "location" and a short, natural, ONE-sentence \`question\` asking for their location so you can find vendors actually near them — make clear this is only to find nearby vendors, never to track them. Do not ask about anything else (brand, model, size, type, budget, etc.) this turn, and do not call any other tool.`;
          const retryResult = await callLLM(
            {
              system: locationOnlySystem,
              messages,
              tools: { askClarifyingQuestion: askClarifyingQuestionTool() },
              toolChoice: "required",
            },
            providerOrder,
          );
          return { retryResult, retryOutcome: extractOutcome(retryResult) };
        }

        const needsLocationButDidntAsk =
          !body?.buyerLocation &&
          !alreadyAskedLocationThisConversation &&
          !outcome.productCall &&
          !outcome.storeCall &&
          !outcome.hasUsefulResults &&
          outcome.clarifyCandidate?.kind !== "location";

        if (needsLocationButDidntAsk) {
          console.warn(
            outcome.clarifyCandidate
              ? `[search] discarded a non-location clarify (${outcome.clarifyCandidate.kind}) when location was actually needed — retrying with a location-only system prompt`
              : "[search] discarded a bare-text location ask with no tool call (buyer location unknown) — retrying with a location-only system prompt",
          );
          ({ retryResult: result, retryOutcome: outcome } =
            await retryLocationOnly());
        }

        // See DUAL_INTENT_TEXT_PATTERN's own comment for the bug this
        // catches: a content-free continuation turn (buyer just shared
        // their location, or gave a bare acknowledgement) whose ORIGINAL
        // substantive message — sitting in `history`, not this turn's own
        // `message` — plausibly named two distinct needs, but the model
        // only called ONE of searchProducts/searchStores this turn,
        // silently dropping the other. Only worth an extra LLM round trip
        // when both conditions hold: exactly one search tool fired (never
        // retries a genuine single-item turn, the overwhelming majority),
        // AND the text heuristic actually flags something. The retry swaps
        // in a single-purpose reminder ON TOP of the real system prompt
        // (not a full replacement, unlike retryLocationOnly — this turn
        // still needs every other rule, just one extra nudge) and keeps
        // its own result only if it actually produced BOTH calls this
        // time; otherwise the original single-tool outcome stands
        // unchanged rather than looping further.
        const onlyOneSearchToolCalled =
          Boolean(outcome.productCall) !== Boolean(outcome.storeCall);
        if (onlyOneSearchToolCalled && !outcome.clarification) {
          const priorText = lastSubstantiveUserMessage(body?.history ?? []);
          if (priorText && DUAL_INTENT_TEXT_PATTERN.test(priorText)) {
            console.warn(
              "[search] only one search tool ran on a content-free continuation turn, and the original message looks dual-intent — retrying with an explicit dual-need reminder",
            );
            const dualReminderSystem = `${system}\n\nIMPORTANT: the buyer's most recent substantive message, earlier in this conversation, was: "${priorText}". If that message names MORE THAN ONE distinct thing they need (e.g. a specific item AND a separate kind of business), you MUST call BOTH searchProducts and searchStores this turn — one for each need — not just one. Do not drop either need.`;
            const retryResult = await callLLM(
              {
                system: dualReminderSystem,
                messages,
                tools: searchTools,
                stopWhen: stepCountIs(4),
              },
              providerOrder,
            );
            const retryOutcome = extractOutcome(retryResult);
            if (retryOutcome.productCall && retryOutcome.storeCall) {
              result = retryResult;
              outcome = retryOutcome;
            }
          }
        }

        // Genuine dual-intent turn (the buyer named a specific item AND a
        // separate kind of business — see isGenuineDualIntent's own
        // comment for how this is told apart from the ordinary mandatory
        // single-item cascade, which also produces both calls). Per
        // explicit request (2026-08-20 redesign, replacing an earlier
        // "hold item A back, reveal both together" design): item A (the
        // product-side term, by convention) is resolved to completion
        // right here and shown IMMEDIATELY, in the exact same shape a
        // normal single-item turn would use — no holding. Item B (the
        // store-side term) is deferred entirely to a background fetch the
        // client makes on its own (`backgroundItem`, resolved via POST
        // /api/search/resolve-item — see that route's own comment), but
        // SearchHome.tsx is what decides WHEN that fetch actually starts:
        // not immediately — only once item A's own flow (including a full
        // multi-turn reach-out-offer exchange, if item A needs one)
        // concludes, per explicit design ("item B doesn't initiate until
        // item A is done... I don't want the app to scroll the user to
        // where it's happening... display like a top bar"). This file's
        // only job is to hand over item A's real outcome now and item B's
        // still-unresolved spec for later — nothing here waits on item B.
        //
        // Neither item reuses the rest of this handler's own pipeline
        // below (the asymmetric cross-check, the unified dead-end
        // handler) — resolveSearchItem already does the equivalent
        // cross-check internally for whichever ONE item it's given. The
        // final result assembly (productStores/storeServices enrichment,
        // the event shape itself) IS deliberately mirrored from the normal
        // pipeline's own tail below, just built from itemAOutcome instead
        // of `outcome`. Ends with an early `return` — nothing below this
        // block runs for this turn.
        //
        // `!isAcknowledgementReply(message)` guard — found live: a buyer
        // clicking "Yes, find someone" to answer item A's own offer can
        // still make the model call BOTH searchProducts and searchStores
        // again (its own reasoning, not something this file controls),
        // which re-triggered this ENTIRE branch on what should have been a
        // plain agreement turn — item A got offered a SECOND time instead
        // of the buyer's "yes" ever reaching createBuyerRequest. A short
        // acknowledgement reply is never a fresh dual-intent request, no
        // matter what the model itself decided to call this turn — let it
        // fall through to the ordinary pipeline below instead, same as any
        // other agreement turn.
        if (
          outcome.productCall &&
          outcome.storeCall &&
          !outcome.clarification &&
          !isAcknowledgementReply(message)
        ) {
          const dualProductInput = outcome.productCall.input as {
            product?: string;
            attributes?: string[];
            location?: string;
          };
          const dualStoreInput = outcome.storeCall.input as {
            businessType?: string;
            location?: string;
          };

          if (
            dualProductInput.product &&
            dualStoreInput.businessType &&
            isGenuineDualIntent(
              dualProductInput.product,
              dualStoreInput.businessType,
            )
          ) {
            // `||`, not `??` — found live: a call's own `location` field can
            // come back as an empty string rather than omitted entirely,
            // which `??` treats as "present" (only nullish counts), silently
            // passing "" through as if the buyer had named an empty place.
            const dualLocation =
              dualProductInput.location || dualStoreInput.location || undefined;
            const itemA: SearchItemInput = {
              type: "product",
              product: dualProductInput.product,
              attributes: dualProductInput.attributes,
            };
            const itemAOutcome = await resolveSearchItem(
              itemA,
              dualLocation,
              body?.buyerLocation,
              push,
            );
            const storeTerm = dualStoreInput.businessType;

            const backgroundItem: BackgroundSearchItem = {
              type: "store",
              businessType: storeTerm,
              location: dualLocation,
            };

            // Mirrors the normal single-item pipeline's own final-event
            // shape (see the tail of this handler below), just sourced
            // from itemAOutcome instead of `outcome` — item A is shown
            // exactly like any ordinary turn, nothing held back.
            let dualReply: string;
            let dualProducts: VendorMatch[] = [];
            let dualProductsMatchTier: MatchTier = null;
            let dualProductsMatchQuality: MatchQuality = undefined;
            let dualStores: StoreMatch[] = [];
            let dualFurtherStores: StoreMatch[] = [];
            let dualStoresMatchTier: MatchTier = null;
            let dualStoresMatchQuality: MatchQuality = undefined;
            let dualStoresQuery: string | null = null;
            let dualExternalSuggestions: NearbyBusiness[] = [];
            let dualBuyerRequestOffered = false;

            if (itemAOutcome.status === "products") {
              dualReply =
                "Found a real match on Velte for that — take a look below.";
              dualProducts = itemAOutcome.products;
              dualProductsMatchTier = itemAOutcome.matchTier;
              dualProductsMatchQuality = itemAOutcome.matchQuality;
            } else if (itemAOutcome.status === "stores") {
              // Unreachable in practice — itemA is always a "product"-type
              // SearchItemInput (see below), and resolveSearchItem only
              // ever returns "stores" for a "store"-type one. Handled
              // anyway since the type doesn't encode that narrowing, with
              // the same plain confirmed-match wording as "products" above
              // (a real cross-index LISTING, not the unconfirmed sector-only
              // "offer" case right below it — see resolveSearchItem's own
              // comment on that distinction).
              dualReply =
                "Found a real match on Velte for that — take a look below.";
              dualStores = itemAOutcome.stores;
              dualFurtherStores = itemAOutcome.furtherStores;
              dualStoresMatchTier = itemAOutcome.matchTier;
              dualStoresMatchQuality = itemAOutcome.matchQuality;
              dualStoresQuery = itemAOutcome.storesQuery;
            } else if (itemAOutcome.status === "offer") {
              dualReply = itemAOutcome.text;
              dualBuyerRequestOffered = true;
            } else {
              dualReply = itemAOutcome.text;
              dualExternalSuggestions = itemAOutcome.externalSuggestions;
            }

            const dualProductKindResults = dualProducts.filter(
              (p) => p.kind !== "service",
            );
            const dualProductStores = dualProductKindResults.length
              ? await getVendorStoresForProducts(dualProductKindResults)
              : [];
            const dualStoreServices =
              dualStores.length || dualFurtherStores.length
                ? await getMatchingServicesForStores(
                    [...dualStores, ...dualFurtherStores],
                    dualStoresQuery,
                  )
                : [];

            controller.enqueue(
              encodeEvent({
                type: "final",
                reply: dualReply,
                toolCalled: true,
                clarification: null,
                products: dualProducts,
                weakProducts: [],
                stores: dualStores,
                furtherStores: dualFurtherStores,
                storesQuery: dualStoresQuery,
                productStores: dualProductStores,
                storeServices: dualStoreServices,
                productsMatchTier: dualProductsMatchTier,
                storesMatchTier: dualStoresMatchTier,
                productsMatchQuality: dualProductsMatchQuality,
                storesMatchQuality: dualStoresMatchQuality,
                externalStoreSuggestions: dualExternalSuggestions,
                vendorProducts: [],
                vendorProductsStore: null,
                buyerRequestOffer: null,
                buyerRequestOffered: dualBuyerRequestOffered,
                backgroundItem,
                // Mirrors dualBuyerRequestOffered — item A's own offer, if
                // this is one, needs the SAME agreement short-circuit as
                // any other offer (see that block's own comment).
                awaitingBuyerRequestReply: dualBuyerRequestOffered,
              }),
            );
            return;
          }
        }

        // Deterministic cross-check — don't trust the model to reliably call
        // the OTHER search tool when its own choice came back empty, even
        // though systemPrompt.ts's symmetric-fallback paragraph tells it to.
        // Found live: gpt-4o-mini calling searchStores alone for "I need a
        // good developer to help build my web and mobile apps", getting zero
        // real Velte stores, and settling for Google Places' generic results
        // without ever trying searchProducts — even though a real Velte
        // vendor's own listing ("Web & Mobile App development") matched the
        // same query directly via searchProducts. Runs the missing tool's
        // core logic directly here, bypassing the model entirely, exactly
        // once, reusing the model's own extracted query text — this applies
        // to every sector equally, not just tech, since the underlying gap
        // (a vendor's real listing outscoring their own store description)
        // can happen for any category. `replyOverride` keeps the buyer-facing
        // text honest: the model's own closing note was written without
        // knowing this fallback would run, so if it finds a real match, the
        // original "couldn't find" narration would otherwise contradict the
        // real result card now being shown.
        let replyOverride: string | null = null;

        if (
          outcome.storeCall &&
          !outcome.productCall &&
          outcome.stores.length === 0
        ) {
          const storeInput = outcome.storeCall.input as {
            businessType?: string;
            location?: string;
            radiusKm?: number;
          };
          if (storeInput.businessType) {
            const fallback = await searchProductsCore(
              {
                product: storeInput.businessType,
                location: storeInput.location,
                radiusKm: storeInput.radiusKm,
              },
              {
                buyerLocation: body?.buyerLocation,
                push,
                weakResultsOut: weakResultsRef,
              },
            );
            if ("results" in fallback && fallback.results.length) {
              outcome = {
                ...outcome,
                products: fallback.results,
                productsMatchTier: fallback.matchTier,
                productsMatchQuality: fallback.matchQuality,
                clarification: null,
              };
              replyOverride =
                "Found a real match on Velte for that — take a look below.";
            }
          }
        } else if (
          outcome.productCall &&
          !outcome.storeCall &&
          outcome.products.length === 0
        ) {
          const productInput = outcome.productCall.input as {
            product?: string;
            attributes?: string[];
            location?: string;
            radiusKm?: number;
          };
          if (productInput.product) {
            const businessType = [
              productInput.product,
              ...(productInput.attributes ?? []),
            ].join(" ");
            const fallback = await searchStoresCore(
              {
                businessType,
                location: productInput.location,
                radiusKm: productInput.radiusKm,
              },
              { buyerLocation: body?.buyerLocation, push },
            );
            // Only a REAL result (an actual sector/description match, not
            // just Places) counts as a find worth showing here — a sector
            // tag alone doesn't confirm this vendor carries the specific
            // product the buyer named (that's what separates a store-level
            // match from a real product/service LISTING, which the mirror
            // branch above treats as a genuine find for exactly that
            // reason). Zero real results — whether or not Places turned up
            // something — falls through unchanged into the unified dead-end
            // handler below, same as the ordinary double-empty case: no
            // special-casing here anymore (see that block's own comment for
            // why — this used to leak Google Places without ever offering a
            // reach-out, a bug logged as "Issue A").
            if ("results" in fallback && fallback.results.length) {
              outcome = {
                ...outcome,
                stores: fallback.results,
                furtherStores: fallback.furtherResults,
                storesMatchTier: fallback.matchTier,
                storesMatchQuality: fallback.matchQuality,
                storesQuery: businessType,
                clarification: null,
              };
              replyOverride =
                "Found a real vendor on Velte for that — take a look below.";
            }
          }
        }

        // Unified "genuine Velte dead end" handler — covers both the
        // ordinary double-empty case (systemPrompt.ts's own mandate for
        // this, now trimmed to a single short closing line — see that
        // file's comment on why) and the asymmetric cross-check fallback
        // just above, whenever it still found nothing real. Fully
        // deterministic/code-authored on purpose, no second LLM call: this
        // used to be entirely the model's own job (decide it's a dead end,
        // write the offer, hold back Google Places) and drifted in
        // practice — sometimes skipping the offer outright (see "Issue A"
        // in the cross-check block above), sometimes narrating Places
        // before it should. A plain phrase pool (statusPhrases.ts) can't
        // drift the way a model call can.
        //
        // Three visible stages per explicit request, not one combined
        // message: (1) a `reply` event — its own chat bubble — closing the
        // loop on the search that just ran; (2) a `status` event narrating
        // a second look now starting; (3) that look actually happening —
        // see the CROSS-CHECK comment below for what it does and why.
        if (
          !outcome.clarification &&
          outcome.products.length === 0 &&
          outcome.stores.length === 0 &&
          outcome.vendorProducts.length === 0 &&
          (outcome.productCall || outcome.storeCall)
        ) {
          const deadEndProductInput = outcome.productCall?.input as
            | { product?: string; attributes?: string[]; location?: string }
            | undefined;
          const deadEndStoreInput = outcome.storeCall?.input as
            | { businessType?: string; location?: string }
            | undefined;
          const productTerm = deadEndProductInput?.product
            ? [
                deadEndProductInput.product,
                ...(deadEndProductInput.attributes ?? []),
              ].join(" ")
            : null;
          const storeTerm = deadEndStoreInput?.businessType ?? null;
          const scanTerm = productTerm ?? storeTerm ?? "that";
          const scanLocation =
            deadEndProductInput?.location ?? deadEndStoreInput?.location;

          controller.enqueue(
            encodeEvent({
              type: "reply",
              text: pickAvoiding(notFoundDirectlyPhrase(scanTerm), []),
            }),
          );
          push(scanningVendorsPhrase(scanTerm));
          const scanStartedAt = Date.now();

          // CROSS-CHECK: try each term against the OTHER index than it was
          // originally searched on — a product name against STORE sectors/
          // descriptions (catches a vendor whose profile fits even without
          // a matching listing), and a business-type term against PRODUCT
          // listings (catches a vendor with a specific listing for the
          // separately-named service, even though their store-level sector
          // tag didn't say so). Radius stays at the ordinary default —
          // widening it does nothing real (every tier already cascades to
          // nationwide in one call regardless of the radius passed in, see
          // retrieval.service.js) — the actual new information here is the
          // cross combination, not a bigger number.
          //
          // Only worth running when BOTH tools were called this turn.
          // When only one was, the asymmetric cross-check block just above
          // this one already tried that exact cross combination while
          // recovering from the model skipping the other tool — repeating
          // it here would just be the identical search again. "Both
          // called" happens two ways: a real dual-intent turn ("a phone
          // repair shop that also sells chargers"), or the ordinary
          // mandatory cascade for a single item (searchProducts empty →
          // the model's own paraphrased businessType for searchStores) —
          // either way, neither term has been tried against the OTHER
          // index yet, so both are worth a shot.
          const bothToolsCalled = Boolean(
            outcome.productCall && outcome.storeCall,
          );
          const storeScan =
            productTerm && bothToolsCalled
              ? await searchStoresCore(
                  {
                    businessType: productTerm,
                    location: scanLocation,
                  },
                  { buyerLocation: body?.buyerLocation, push },
                )
              : null;
          const productScan =
            storeTerm && bothToolsCalled
              ? await searchProductsCore(
                  { product: storeTerm, location: scanLocation },
                  { buyerLocation: body?.buyerLocation, push },
                )
              : null;
          const storeScanResult =
            storeScan && "results" in storeScan ? storeScan : null;
          const productScanResult =
            productScan && "results" in productScan ? productScan : null;

          // Found live (2026-08-19): a fast scan can resolve in well under a
          // second, which just flashes the "widening the search…" status
          // line for a frame before Bubble 2 replaces it — too quick to
          // actually read, defeating the point of a visible second stage.
          // Padding up to a minimum floor (never slowing down an already-
          // slow scan, only topping up a fast one) keeps this readable
          // without making the ordinary case feel sluggish. Applies even
          // when neither cross-check above actually ran (bothToolsCalled
          // false) — the bubble/status sequence should feel consistent
          // either way, not skip straight to a resolution just because
          // there was nothing new left to check.
          const MIN_SCAN_DISPLAY_MS = 3000;
          const scanElapsedMs = Date.now() - scanStartedAt;
          if (scanElapsedMs < MIN_SCAN_DISPLAY_MS) {
            await new Promise((resolve) =>
              setTimeout(resolve, MIN_SCAN_DISPLAY_MS - scanElapsedMs),
            );
          }

          if (productScanResult && productScanResult.results.length) {
            // A real product/service LISTING for the separately-named
            // half of a dual-intent turn — same confidence tier as the
            // "Found a real match" cross-check above (a vendor's own
            // deliberate listing, not just a sector tag), so it gets the
            // same plain "found it" treatment, not the lower-confidence
            // reach-out offer below.
            outcome = {
              ...outcome,
              products: productScanResult.results,
              productsMatchTier: productScanResult.matchTier,
              productsMatchQuality: productScanResult.matchQuality,
            };
            replyOverride =
              "Found a real match on Velte for that — take a look below.";
          } else if (storeScanResult && storeScanResult.results.length) {
            outcome = { ...outcome, buyerRequestOffered: true };
            replyOverride = pickAvoiding(
              foundPossibleVendorPhrase(scanTerm),
              [],
            );
          } else {
            const mergedExternal = Array.from(
              new Map(
                [
                  ...outcome.externalStoreSuggestions,
                  ...(storeScanResult?.externalSuggestions ?? []),
                  ...(productScanResult?.externalSuggestions ?? []),
                ].map((b) => [b.placeId, b]),
              ).values(),
            );
            outcome = {
              ...outcome,
              externalStoreSuggestions: mergedExternal,
              // Explicit false, not left as whatever extraction produced —
              // this scan is the authoritative last word on whether a
              // reach-out offer happened, overriding even a spurious
              // offerBuyerRequestTool call the model made despite
              // systemPrompt.ts now telling it not to (the same
              // non-compliance class this whole handler exists to guard
              // against — see this block's own top comment).
              buyerRequestOffered: false,
            };
            replyOverride = pickAvoiding(
              noVendorEvenBySectorPhrase(mergedExternal.length > 0),
              [],
            );
          }
        }

        // A real search DID run, nationwide, without ever asking for
        // location first. Moved to here (2026-08-19, was BEFORE the cross-
        // check/dead-end handler above) after finding live: the dead-end
        // handler's own cross-check can genuinely find a real vendor (e.g.
        // a computer-repair store matching "fix my laptop screen" by
        // sector, missed by the original searches) — firing this location
        // retry on the ORIGINAL pre-cross-check outcome discarded that real
        // find every time, unconditionally, before it ever had a chance to
        // run. Now gated on the FINAL outcome instead: only fires if
        // everything — the original searches AND the cross-check AND
        // Google Places — still came up with nothing at all. "A real find
        // isn't thrown away for a location question that could've been
        // asked after trying to help" was the explicit ask; this is that,
        // literally — try everything first, ask last, only if still
        // needed. `replyOverride` is reset to null when this fires: it may
        // already hold the dead-end handler's own "nothing found" text,
        // which would otherwise wrongly win over the location question in
        // the final reply below.
        const stillGenuinelyNothing =
          !outcome.clarification &&
          outcome.products.length === 0 &&
          outcome.stores.length === 0 &&
          outcome.vendorProducts.length === 0 &&
          !outcome.buyerRequestOffered &&
          outcome.externalStoreSuggestions.length === 0;
        const anyCallHadNamedLocation = [
          outcome.productCall,
          outcome.storeCall,
        ].some(
          (call) =>
            call && (call.input as { location?: string } | undefined)?.location,
        );
        const searchedNationwideWithoutAsking =
          !body?.buyerLocation &&
          !anyCallHadNamedLocation &&
          !alreadyAskedLocationThisConversation &&
          stillGenuinelyNothing &&
          Boolean(outcome.productCall || outcome.storeCall);

        if (searchedNationwideWithoutAsking) {
          console.warn(
            "[search] still nothing after the dead-end cross-check, with no location signal — retrying with a location-only system prompt",
          );
          ({ retryResult: result, retryOutcome: outcome } =
            await retryLocationOnly());
          replyOverride = null;
        }

        const {
          clarification,
          products,
          stores,
          furtherStores,
          storesQuery,
          productsMatchTier,
          storesMatchTier,
          productsMatchQuality,
          storesMatchQuality,
          externalStoreSuggestions,
          vendorProducts,
          vendorProductsStore,
          buyerRequestOffer,
          buyerRequestOffered,
          productCall,
          storeCall,
        } = outcome;

        // Skipped (not just discarded) when the clarification actually won
        // — no point spending an extra lookup on data that's about to be
        // suppressed below anyway. Product-kind results only: a service
        // result's own card already shows everything the vendor uploaded
        // (see VendorResultCard) and its own WhatsApp CTA, so a companion
        // "Sold by" store card would just be a redundant second contact
        // point for the same vendor.
        const productKindResults = products.filter((p) => p.kind !== "service");
        const productStores =
          productKindResults.length && !clarification
            ? await getVendorStoresForProducts(productKindResults)
            : [];

        // Same "skipped when the clarification actually won" reasoning —
        // only worth the extra per-store lookups when the buyer is actually
        // going to see `stores`/`furtherStores` this turn. Both buckets share
        // one lookup — the function already keys its output by vendorId, so
        // the frontend groups each result under whichever of its own two
        // sections (near you vs further out) that vendor's card is in.
        const storeServices =
          (stores.length || furtherStores.length) && !clarification
            ? await getMatchingServicesForStores(
                [...stores, ...furtherStores],
                storesQuery,
              )
            : [];

        // A real SEARCH tool's results are what the buyer sees this turn
        // whenever any exist — see hasUsefulResults inside extractOutcome.
        // Only a genuinely empty outcome (or no search tool call at all)
        // falls through to the clarification, in which case toolCalled is
        // false so the frontend renders the paused question instead of a
        // dead-end card.
        const toolCalled = !clarification;

        // Same "skipped when the clarification actually won" reasoning as
        // productStores above — dead weight the buyer will never see once a
        // clarifying question takes over the turn instead.
        const weakProducts = clarification ? [] : weakResultsRef.current;

        controller.enqueue(
          encodeEvent({
            type: "final",
            // The `|| clarification?.question` fallback matters specifically
            // for the forced-tool retry above: some providers return a
            // forced tool call with little or no accompanying text content,
            // and askClarifyingQuestion's own `question` field IS meant to
            // double as the reply either way (see that tool's own comment)
            // — so a buyer never sees a blank bubble sitting above a
            // perfectly good clarification widget.
            reply:
              replyOverride ??
              (sanitizeReply(result.text) || clarification?.question) ??
              "",
            toolCalled,
            clarification,
            products,
            weakProducts,
            stores,
            furtherStores,
            storesQuery,
            productStores,
            storeServices,
            productsMatchTier,
            storesMatchTier,
            productsMatchQuality,
            storesMatchQuality,
            externalStoreSuggestions,
            vendorProducts,
            vendorProductsStore,
            buyerRequestOffer,
            buyerRequestOffered,
            // Null on this, the ordinary single-item path — only the
            // dual-intent branch further up this file (its own early
            // `return`) ever populates this.
            backgroundItem: null,
            // Mirrors buyerRequestOffered — covers the rare case where the
            // model itself still calls offerBuyerRequestTool directly
            // (still a registered tool, even though systemPrompt.ts no
            // longer instructs the double-empty case to reach for it — see
            // that file's own comment) — same agreement short-circuit
            // applies regardless of which code path produced the offer.
            awaitingBuyerRequestReply: buyerRequestOffered,
          }),
        );

        // Recruitment-lead capture — the ONE thing worth persisting beyond
        // the conversation itself: Velte had no vendor for this request AND
        // Google Places surfaced a real, unlisted business nearby, so it's
        // worth the company following up to get that business onto Velte.
        // Deliberately not a general log of every search — a prior version
        // wrote every query's raw text and the buyer's precise coordinates
        // to the DB regardless of outcome; removed, since nothing should
        // persist beyond the browser session without a real business
        // reason to. Skipped entirely (no request at all) when there's
        // nothing to report, and awaited so it reliably completes before
        // the stream closes — never surfaced to the buyer either way, they
        // already have their answer from the "final" event above.
        if (externalStoreSuggestions.length > 0) {
          try {
            const productInput = productCall?.input as
              | { product?: string }
              | undefined;
            const storeInput = storeCall?.input as
              | { businessType?: string }
              | undefined;

            await aiSearchFetch("/search/log", {
              method: "POST",
              body: {
                rawQuery: message || null,
                parsedProduct:
                  productInput?.product ?? storeInput?.businessType ?? null,
                externalStoreSuggestions,
              },
            });
          } catch (err) {
            console.error("[search] recruitment lead log failed:", err);
          }
        }
      } catch (err) {
        console.error("[search] request failed:", err);
        controller.enqueue(
          encodeEvent({
            type: "error",
            message:
              "Search is temporarily unavailable. Please try again shortly.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
