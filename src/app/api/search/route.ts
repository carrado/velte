import { stepCountIs, type ModelMessage, type UserContent } from "ai";

import { buildProductTerm } from "@/lib/productTerm";
import { generateUUID } from "@/lib/uuid";
import { callLLM } from "@/lib/server/ai/router";
import { withTurnUsage, annotateTurn } from "@/lib/server/ai/usage";
import {
  affordCredits,
  chargeCredits,
  creditMessage,
} from "@/lib/server/creditLedger";
import type { CreditAction } from "@/lib/credits";
import { buildPriceBand, isBandableQuery } from "@/lib/server/ai/priceBand";
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
import { askClarifyingQuestionTool } from "@/lib/server/ai/askClarifyingQuestionTool";
import { createBuyerRequestTool } from "@/lib/server/ai/createBuyerRequestTool";
import { offerBuyerRequestTool } from "@/lib/server/ai/offerBuyerRequestTool";
import { buildRequestDescriptionTool } from "@/lib/server/ai/buildRequestDescriptionTool";
import {
  pickRecommendation,
  pickExternalRecommendation,
} from "@/lib/server/ai/recommendResults";
import { getAttributeSchemaOverrides } from "@/lib/server/attributeSchemas";
import {
  fetchExternalOffers,
  hasExternalConnectors,
} from "@/lib/server/connectors";
import {
  understandingRequestPhrase,
  pickAvoiding,
  checkingElsewherePhrase,
  checkingPhotosPhrase,
  comparingOptionsPhrase,
  notFoundDirectlyPhrase,
  scanningVendorsPhrase,
  foundPossibleVendorPhrase,
  noVendorEvenBySectorPhrase,
  noVendorButOnlineOffersPhrase,
  isAcknowledgementReply,
  isOfferDeclineReply,
  splittingRequestPhrase,
  itemPickQuestionPhrase,
} from "@/lib/server/ai/statusPhrases";
import {
  buildSystemPrompt,
  buildAgreementOnlySystemPrompt,
  buildDescriptionOnlySystemPrompt,
  buildScopeCheckSystemPrompt,
} from "@/lib/server/ai/systemPrompt";
import { classifyScopeTool } from "@/lib/server/ai/classifyScopeTool";
import { watchCandidatesFor } from "@/lib/server/ai/watchCandidates";
import {
  buildWatchIntentPrompt,
  classifyWatchIntentTool,
} from "@/lib/server/ai/classifyWatchIntentTool";
import { verifyOfferMatches } from "@/lib/server/ai/verifyMatches";
import { generateItemClarifiers } from "@/lib/server/ai/generateItemClarifiers";
import {
  getSectorClarifiers,
  getGeneralClarifierFields,
  looksLikeServiceTask,
  allowsNearbyBusinesses,
  buildClarifyingQuestion,
} from "@/lib/server/ai/sectorClarifiers";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import {
  ensureSearchConversation,
  appendSearchTurn,
  type EnsuredSearchConversation,
} from "@/lib/server/searchConversations";
import { buildTurnSnapshot } from "@/lib/searchTurnSnapshot";
import type {
  BackgroundSearchItem,
  BuyerLocation,
  BuyerRequestOffer,
  BuyerRequestToolOutcome,
  Clarification,
  ExternalOffer,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  RequestRelation,
  SearchIntentKind,
  SearchRecommendation,
  SearchRequestBody,
  SearchStreamEvent,
  StoreMatch,
  StoreProductItem,
  VendorMatch,
  WatchCandidate,
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
// The buyer holds a multi-turn conversation across several of these
// single-turn calls. As of Phase 1 (docs/velte-ai-search-flow-plan.md) the
// conversation is PERSISTED server-side in staffly-ai-backend, keyed by the
// client's anonymous deviceId + conversationId: each turn's snapshot is
// written right after its final event (see sendFinal), the model-facing
// text history is rebuilt from those stored turns (see the ensure call
// below), and SearchHome.tsx rehydrates the whole thread after a refresh.
// This reverses the original "nothing persists beyond the tab" design — the
// active-shopping-task/refinement loop and structured demand logging both
// need it. The client still resends its own text-only `history` as a
// fallback so a persistence outage (or a request with no deviceId at all)
// degrades to exactly the old stateless behavior, never a failed search.
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
// Narrower than the full BuyerRequestOffer union, listing exactly the three
// statuses that actually reach this function:
//   - the two a tool call can return (BuyerRequestToolOutcome), and
//   - "no_match", which no longer comes from the tool but IS still built by
//     hand on the pre-check path below (the "we already know there's no
//     vendor" short-circuit that never calls the model at all).
// "created" and "error" are absent because nothing server-side produces
// them any more — the frontend's own POST writes that turn's text itself.
// Typing this narrowly is what makes the compiler catch a missing case
// instead of shipping an empty reply; it has already caught two.
function buyerRequestStatusReply(
  offer: Extract<
    BuyerRequestOffer,
    {
      status:
        | "needs_signin"
        | "needs_identity"
        | "needs_phone_choice"
        | "no_match";
    }
  >,
): string {
  switch (offer.status) {
    // Says WHY an account is needed rather than just demanding one: a
    // vendor replies to this request personally, so there has to be a real
    // person on the other end for them to reply to. The Google button
    // renders below the reply — never ask them to type anything here.
    case "needs_signin":
      return "To send this to vendors I'll need you signed in first — that's how a vendor knows who they're replying to, and how you get their reply back. It takes one tap.";
    case "needs_identity":
      return "To reach out on your behalf, I'll just need your WhatsApp number — make sure it's one vendors can actually reach you on there, since that's how they'll get back to you.";
    // Never writes the number out — the confirmation below the reply
    // already shows it, and repeating it here would put a phone number in
    // the reply text, which this route sanitizes against everywhere else.
    case "needs_phone_choice":
      return "Before I send this out — just confirm the number a vendor should reach you on.";
    case "no_match":
      return "Couldn't find anyone on Velte to contact for this right now.";
  }
}

/** Text/sector match only — same bar createBuyerRequest uses to find who to notify. */
async function hasContactableVendorsForQuery(
  query: string,
  buyerLocation?: BuyerLocation,
): Promise<boolean> {
  const q = query.trim();
  if (!q) return false;
  try {
    const [productCheck, storeCheck] = await Promise.all([
      // allowNearbyBusinesses: false — this probe only ever counts real
      // Velte vendors (below), so a Places lookup here would be spend with
      // nothing reading the result.
      searchProductsCore(
        { product: q },
        { buyerLocation, allowNearbyBusinesses: false },
      ),
      searchStoresCore(
        { businessType: q },
        { buyerLocation, allowNearbyBusinesses: false },
      ),
    ]);
    const productHits =
      "results" in productCheck ? productCheck.results.length : 0;
    const storeHits = "results" in storeCheck ? storeCheck.results.length : 0;
    return productHits > 0 || storeHits > 0;
  } catch (err) {
    console.error("[search] contactable-vendor check failed:", err);
    return false;
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
          // A plain vendorId lookup, not a search — no businessType query
          // to attribute this store to (see StoreMatch's own comment).
          matchedQuery: null,
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

// buildProductTerm (product + attributes, deduped against restatement —
// see src/lib/productTerm.ts's own comment) lives there, not here, since
// SearchHome.tsx's own backgroundItemLabel needs the identical fix and
// can't import a server-only file — see that file's own import.

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
// "plumber" — none). Deliberately a cheap heuristic — and, since a false
// positive here means the buyer sees a fabricated, confusing choice rather
// than just an extra background search, no longer trusted alone: the call
// site also requires hasMultipleIntents (classifyScopeTool.ts, the
// dedicated pre-flight classifier judging intent count straight from the
// buyer's own words, before any tool call happens) to independently agree
// first. That classifier was added specifically because THIS heuristic
// still isn't reliable enough on its own — found live: a photo of one item
// + the caption "where can I get this" got the model to call
// searchProducts for the identified item, hit the same zero-result
// mandatory cascade described below, and land on a store term sharing
// neither a literal token nor a SAME_NEED_VERBS verb with the product term
// — passing this function's own check and getting misread as two separate
// needs even though the buyer only ever asked about the one thing in the
// photo. Requiring both signals to agree is strictly more conservative
// than either alone, which is the right direction for a check whose
// failure mode is a buyer-visible, made-up split.
//
// Found live: "I need someone who can fix my Infinix Hot 50i" — a SINGLE
// need — got the model to call searchProducts("Infinix Hot 50i repair")
// AND searchStores("phone repair shop") in the same step (the ordinary
// mandatory cascade, since no vendor lists that exact model), and the
// ratio check below misread it as genuine dual intent anyway: a specific
// phone model's own name shares zero literal vocabulary with the generic
// word "phone", so the only shared token was "repair" — 1 shared token
// out of the shorter side's 3 (phone/repair/shop) is a 0.33 ratio, just
// under DUAL_INTENT_MAX_OVERLAP. Ratio alone can't tell "same need,
// different granularity" (a model name vs. its own general category) from
// "genuinely different things" when the shorter term is this short — a
// higher threshold would just move the same failure onto some other short
// pair. SAME_NEED_VERBS is a narrower, more reliable signal for this
// specific shape: "someone who can repair/fix/install/clean/service X"
// makes the model describe ONE need twice — a specific product-repair
// term and a matching generic repair-shop term — and both sides will
// share the exact same service verb regardless of how different the noun
// itself looks. Checked before the ratio, since it's a stronger signal
// than raw overlap can capture here.
const SAME_NEED_VERBS = [
  "repair",
  "fix",
  "install",
  "service",
  "clean",
  "wash",
  "maintain",
  "tailor",
  "alter",
];
const DUAL_INTENT_MAX_OVERLAP = 0.34;
function isGenuineDualIntent(productTerm: string, storeTerm: string): boolean {
  const productTokens = new Set(tokenize(productTerm));
  const storeTokens = new Set(tokenize(storeTerm));
  if (!productTokens.size || !storeTokens.size) return false;

  for (const verb of SAME_NEED_VERBS) {
    const stemmed = stem(verb);
    if (productTokens.has(stemmed) && storeTokens.has(stemmed)) return false;
  }

  let shared = 0;
  for (const t of productTokens) if (storeTokens.has(t)) shared++;
  const overlapRatio = shared / Math.min(productTokens.size, storeTokens.size);
  return overlapRatio < DUAL_INTENT_MAX_OVERLAP;
}

// Mandatory zero-result cascade paraphrase: a specific product term plus a
// short generic "… store/shop/…" venue for the SAME need ("orange polo" →
// "clothing store", "Tecno charger" → "phone accessories store"). Token
// overlap alone misses these — the nouns rarely share vocabulary. Only for
// the product+store dual-intent shape (never store+store / product+product,
// where both sides can legitimately end in "store").
const GENERIC_VENUE_SUFFIX =
  /\b(?:stores?|shops?|outlets?|boutiques?|markets?|vendors?|stalls?)\s*$/i;
function isProductToCategoryStoreCascade(
  productTerm: string,
  storeTerm: string,
): boolean {
  if (!GENERIC_VENUE_SUFFIX.test(storeTerm.trim())) return false;
  const category = storeTerm.replace(GENERIC_VENUE_SUFFIX, "").trim();
  const categoryTokens = tokenize(category);
  return categoryTokens.length > 0 && categoryTokens.length <= 3;
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
// Caption that only points at an attached photo — always one need, never two
// (see classifyScopeTool.ts). Used server-side so a flaky hasMultipleIntents
// from the pre-flight classifier can't still invent a dual-intent split.
const PHOTO_REFERRING_CAPTION =
  /^(?:where can i (?:find|get) this|how much(?: is this)?|what(?:'s| is) this|find(?: me)? this|get(?: me)? this|this(?: one)?)\b/i;
function isSharedLocationMessage(text: string): boolean {
  return text.trim() === "Shared my location";
}
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
    if (isAcknowledgementReply(trimmed) || isSharedLocationMessage(trimmed))
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
              avatar: store.avatar,
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
        kind: "choice" | "text" | "location" | "name";
        options?: string[];
      }
    | undefined;
  // Downgrades a malformed "choice" (missing/too-few options) to "text"
  // server-side, so the frontend's discriminated Clarification type never
  // has to re-validate what the model actually sent. "location" and "name"
  // both pass through as-is — neither ever has options to validate in the
  // first place. "name" specifically must NOT fall into the "text" branch
  // below (it used to, before this kind existed) — SearchHome.tsx routes
  // "name" through the composer's own dedicated single-line input, same
  // treatment phone/OTP already get, instead of ClarificationPrompt's
  // separate inline text box (found live — see that component's own
  // comment on why a bare "text" kind was the wrong shape for this one
  // specific question).
  const clarifyCandidate: Clarification | null = !clarifyInput
    ? null
    : clarifyInput.kind === "location"
      ? { kind: "location", question: clarifyInput.question }
      : clarifyInput.kind === "name"
        ? { kind: "name", question: clarifyInput.question }
        : clarifyInput.kind === "choice" &&
            (clarifyInput.options?.length ?? 0) >= 2
          ? {
              kind: "choice",
              question: clarifyInput.question,
              options: clarifyInput.options!,
            }
          : { kind: "text", question: clarifyInput.question };

  // .findLast, not .find, for the CALL itself — a fallback model (Groq)
  // occasionally calls a tool more than once for one turn (a real, common
  // shape once a buyer names two needs that both happen to phrase as the
  // same tool — e.g. "fix my laptop" AND "a caterer for my wedding" are
  // both searchStores calls, not one product + one store, so
  // isGenuineDualIntent's own productCall+storeCall precondition never
  // even sees this as dual-intent). The most recent call is still what's
  // used wherever a single representative `.input` is needed (the
  // asymmetric cross-check, the dual-intent branch).
  const productCall = result.toolCalls.findLast(
    (c) => c.toolName === "searchProducts",
  );
  const storeCall = result.toolCalls.findLast(
    (c) => c.toolName === "searchStores",
  );

  type ProductToolOutput = {
    results?: VendorMatch[];
    matchTier?: MatchTier;
    matchQuality?: MatchQuality;
    externalSuggestions?: NearbyBusiness[];
  };
  type StoreToolOutput = {
    results?: StoreMatch[];
    furtherResults?: StoreMatch[];
    matchTier?: MatchTier;
    matchQuality?: MatchQuality;
    externalSuggestions?: NearbyBusiness[];
  };
  // .filter, not .findLast, for the RESULTS — found live: the single-call
  // .findLast this used to be silently DROPPED every earlier call's real
  // results the instant the model called the same tool twice in one turn.
  // The model's own final reply text still narrated the dropped one (it
  // saw that real tool result in its own context before writing the
  // text), so the buyer got a full description of a genuine vendor — name,
  // what they do, "chat on WhatsApp" — with no card, no actual WhatsApp
  // button, nothing to act on; a coincidentally-later-called search's own
  // vendor rendered as a normal, fully working card right next to it.
  // Every call to the same tool this turn now contributes its own
  // results, merged (deduped by id) rather than the last one winning and
  // the rest silently vanishing.
  const productOutputs = result.toolResults
    .filter((r) => r.toolName === "searchProducts")
    .map((r) => r.output as ProductToolOutput);
  // Each store here already carries its own `matchedQuery` (see
  // searchStoresCore) — the exact businessType THAT call searched for, set
  // at the source rather than re-derived here — so a turn that calls
  // searchStores more than once for genuinely different needs (e.g. "fix my
  // laptop, and a caterer for my wedding" — see the .findLast comment above)
  // still gives each store its own accurate query once merged into one
  // array below, instead of every store inheriting whichever call's
  // businessType `storesQuery` (singular, turn-level) happens to point at.
  const storeOutputs = result.toolResults
    .filter((r) => r.toolName === "searchStores")
    .map((r) => r.output as StoreToolOutput);
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
          avatar: string | null;
        };
      }
    | undefined;
  // createBuyerRequestTool's execute() return value needs no reshaping,
  // unlike the search tools above (which return a raw retrieval-service
  // shape). Typed as the TOOL's own narrow outcome — the tool stopped
  // creating anything (2026-08-26), so "created"/"no_match"/"error" can
  // never arrive here even though BuyerRequestOffer still carries them for
  // the frontend-created turns.
  const buyerRequestOffer =
    (result.toolResults.findLast((r) => r.toolName === "createBuyerRequest")
      ?.output as BuyerRequestToolOutcome | undefined) ?? null;
  // See offerBuyerRequestTool's own comment — a mechanical signal, not
  // inferred from the reply text, that this turn's reply IS the reach-out
  // offer, so route.ts/the frontend know to hold back any Google Places
  // fallback the co-called search may have already returned.
  const buyerRequestOffered = result.toolResults.some(
    (r) => r.toolName === "offerBuyerRequest",
  );
  const products = Array.from(
    new Map(
      productOutputs
        .flatMap((o) => o.results ?? [])
        .map((p) => [p.productId, p]),
    ).values(),
  );
  const stores = Array.from(
    new Map(
      storeOutputs.flatMap((o) => o.results ?? []).map((s) => [s.storeId, s]),
    ).values(),
  );
  const furtherStores = Array.from(
    new Map(
      storeOutputs
        .flatMap((o) => o.furtherResults ?? [])
        .map((s) => [s.storeId, s]),
    ).values(),
  );
  // Tier/quality each drive a SINGLE section heading (productsHeading/
  // storesHeading in SearchHome.tsx) — not representable per-item once
  // results from more than one call to the same tool are merged together
  // above, so this takes whichever call actually produced real results,
  // preferring the LAST one if more than one did (same recency bias the
  // old single-call .findLast used).
  const productsMatchTier =
    productOutputs.findLast((o) => (o.results?.length ?? 0) > 0)?.matchTier ??
    null;
  const storesMatchTier =
    storeOutputs.findLast((o) => (o.results?.length ?? 0) > 0)?.matchTier ??
    null;
  const productsMatchQuality = productOutputs.findLast(
    (o) => (o.results?.length ?? 0) > 0,
  )?.matchQuality;
  const storesMatchQuality = storeOutputs.findLast(
    (o) => (o.results?.length ?? 0) > 0,
  )?.matchQuality;
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
        ...productOutputs.flatMap((o) => o.externalSuggestions ?? []),
        ...storeOutputs.flatMap((o) => o.externalSuggestions ?? []),
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
    // ALL searchStores/searchProducts calls this turn, not just the
    // latest — needed by the dual-intent detection's own "same tool
    // called twice" shapes below (see that block's comment): productCall/
    // storeCall alone (.findLast) can't tell two genuinely different
    // calls apart from one call repeated, since each only ever keeps the
    // most recent one.
    storeCalls: result.toolCalls.filter((c) => c.toolName === "searchStores"),
    productCalls: result.toolCalls.filter(
      (c) => c.toolName === "searchProducts",
    ),
  };
}

// A single long token dense with digits/symbols (a bcrypt hash, a JWT, an
// API key, a UUID, a raw hex digest) is never a real shopping request — no
// buyer types a 40+ character alphanumeric blob to describe something they
// want to buy. Checked BEFORE the model ever sees the message at all: found
// live, systemPrompt.ts's own "IN SCOPE" judgment (see buildSystemPrompt)
// is NOT reliable for this specific shape of input — across repeated runs
// on the exact same pasted bcrypt hash, the model variously declined
// correctly, tried to search with the hash as a literal product name, or
// even fabricated a "dual intent" split out of it (once matching it against
// "product" as a second, invented item). A deterministic pre-check
// sidesteps every one of those failure modes for the one case that's
// unambiguous enough to catch without an LLM at all — real natural-language
// text, even a single plain word like "sneakers" or "generator", never
// looks like this. Deliberately narrow: a multi-word off-topic message
// ("what's the capital of France") still needs the model's own judgment
// (see systemPrompt.ts's IN SCOPE paragraph) — this only ever catches
// noise, never a real (if unrelated) sentence.
function looksLikeGibberishInput(message: string): boolean {
  const trimmed = message.trim();
  // Multi-word text (any whitespace at all) always gets the model's own
  // judgment — a real query can legitimately be long and symbol-heavy
  // ("case for iPhone 14 Pro Max - black, 6.7\""), just never a single
  // unbroken token.
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (trimmed.length < 20) return false;
  // A JWT (three dot-separated base64url segments — header.payload.signature)
  // is almost entirely letters, so the digit/symbol-density check below
  // wouldn't reliably catch it on its own — matched by its own distinctive
  // shape instead.
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    return true;
  }
  const nonLetterCount = trimmed.replace(/[a-zA-Z]/g, "").length;
  return nonLetterCount / trimmed.length >= 0.3;
}

// Cost instrumentation wrapper (2026-08-28, see lib/server/ai/usage.ts).
// Deliberately wraps the WHOLE handler: every callLLM underneath lands in
// this turn automatically via AsyncLocalStorage, including calls added by
// future code that never knows this exists. One `[cost] {...}` line is
// emitted per turn, and the turn is annotated with buyer/photo a few lines
// into handleSearch once those are actually known.
export async function POST(req: Request) {
  return withTurnUsage(
    { turnId: generateUUID(), buyerId: null, hasImage: false },
    () => handleSearch(req),
  );
}

async function handleSearch(req: Request) {
  const body = (await req.json().catch(() => null)) as SearchRequestBody | null;
  const message = body?.message?.trim() ?? "";
  const imageUrl = body?.imageUrl;
  // Resolved once, up front — search itself stays fully anonymous either
  // way (see this route's own top comment), this is only ever read by
  // createBuyerRequestTool to decide whether it can create the request
  // immediately or has to hand back `needs_identity` instead.
  const buyerAuth = await getOptionalBuyerAuth();

  // The two dimensions the whole cost dataset is sliced by.
  annotateTurn({
    buyerId: buyerAuth?.buyerId ?? null,
    hasImage: Boolean(imageUrl),
  });

  if (!message && !imageUrl) {
    return new Response(
      JSON.stringify({
        type: "error",
        message: "message or imageUrl is required.",
      } satisfies SearchStreamEvent) + "\n",
      { status: 400, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  // Quota gate (2026-08-29, see lib/server/usage.ts + ai/plans.ts).
  //
  // Placed HERE deliberately: after the cheap validation above, but before
  // any conversation load, retrieval or LLM call — the whole point is to
  // refuse a turn before it spends money, and a gate that runs after the
  // model has already answered protects nothing.
  //
  // Photo turns are metered as their own kind because they cost a multiple
  // of a text turn (the buyer's image, plus the multimodal verification and
  // comparison calls). Metering is fail-open: if the backend is asleep or
  // slow, `allowed` comes back true and the buyer searches anyway.
  // A VENDOR signed in on /chat is a real account too, on a different cookie
  // (`auth_token`, not `buyer_auth_token`). Reading only the buyer one made
  // them look anonymous here: refused photo search and told to sign in while
  // already signed in. Buyer wins when both cookies exist — on /chat they are
  // acting as a buyer, and only a buyer account carries a plan.
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  const actorType = buyerAuth ? "buyer" : vendorAuth ? "vendor" : "guest";
  const actorCookie = buyerAuth?.cookie ?? vendorAuth?.cookie ?? null;
  // The turn's action, and therefore its price: a photo turn costs 5 credits
  // where a text turn costs 1, because it genuinely costs that multiple to
  // serve (see CREDIT_COST).
  //
  // CHECKED here, CHARGED on success (see sendFinal). Nothing is taken up
  // front: a buyer should never pay for a turn that failed, or for one
  // answered from the nearby-business path, which never reaches Serper and so
  // costs nothing to have run. The check still happens first, because
  // otherwise an empty balance could trigger a real model call and simply not
  // pay for it.
  const turnAction: CreditAction = imageUrl ? "photo" : "text";
  const usage = await affordCredits({
    actorType,
    cookie: actorCookie,
    action: turnAction,
  });
  // Set once the turn has been charged — see sendFinal. Guards against the
  // several early-exit paths billing one turn twice.
  let turnCharged = false;
  if (!usage.allowed) {
    // A `quota` event, not an `error`: the client renders it as an upgrade /
    // sign-in prompt rather than a failure, and nothing went wrong here —
    // this is the product working as designed. Carries the numbers so the
    // UI can show a meter without a second request.
    return new Response(
      JSON.stringify({
        type: "quota",
        message: creditMessage(usage),
        kind: turnAction === "photo" ? "photo" : "text",
        // `used`/`limit` carry balance and cost — the same two numbers a
        // meter needs, in the terms the credit model actually has.
        used: usage.balance,
        limit: usage.cost,
        planId: usage.isGuest ? "guest" : "credits",
        planName: "Velte credits",
        isGuest: usage.isGuest,
        actorType,
        // Always "exhausted": there is no tier for a feature to be absent
        // from any more, only a balance that does or doesn't cover it.
        reason: "exhausted",
      } satisfies SearchStreamEvent) + "\n",
      { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  const content: UserContent = [];
  if (message) content.push({ type: "text", text: message });
  if (imageUrl) {
    content.push({ type: "file", mediaType: "image", data: new URL(imageUrl) });
  }

  // Persisted-conversation load (Phase 1, docs/velte-ai-search-flow-plan.md)
  // — when the client identifies itself with a deviceId, the conversation
  // (and the model-facing history below) lives server-side in
  // staffly-ai-backend, surviving a refresh; the turn's snapshot is written
  // back right after the final event (see sendFinal). Every failure mode
  // here degrades to the old stateless behavior — the search itself never
  // depends on persistence being up.
  //
  // 2026-08-27: persistence is now gated on being SIGNED IN, per explicit
  // product decision — "no conversation is saved for any buyer that is not
  // signed in". A conversation is account data, and `buyer_auth_token` means
  // one thing since the same date: signed in with Google. An anonymous buyer
  // gets exactly the pre-persistence behaviour — a thread that lives in the
  // tab and is gone on refresh — which is also what every failure path here
  // already degraded to, so nothing new had to be built for it.
  //
  // Treating deviceId as null when there's no session is what switches it
  // off: every call below is already guarded on deviceId, so one condition
  // turns off ensure, append and rehydrate together rather than three
  // separate gates that could drift apart.
  const deviceId =
    buyerAuth && typeof body?.deviceId === "string" && body.deviceId.trim()
      ? body.deviceId.trim()
      : null;
  // Phase 5: whatever this turn knows about location, merged onto the
  // conversation server-side (never overwriting a settled position — see
  // mergeBuyerLocation in staffly-ai-backend). Undefined on turns where
  // nothing about location changed, so the merge is a no-op.
  const locationUpdate =
    body?.buyerLocation || body?.locationDeclined || body?.locationPlaceName
      ? {
          lat: body?.buyerLocation?.lat,
          lng: body?.buyerLocation?.lng,
          placeName: body?.locationPlaceName,
          declined: body?.locationDeclined,
        }
      : undefined;

  let conversation: EnsuredSearchConversation | null = null;
  if (deviceId) {
    try {
      conversation = await ensureSearchConversation({
        deviceId,
        conversationId:
          typeof body?.conversationId === "string" ? body.conversationId : null,
        buyerId: buyerAuth?.buyerId ?? null,
        buyerLocation: locationUpdate,
      });
    } catch (err) {
      console.error(
        "[search] conversation ensure failed, going stateless:",
        err,
      );
    }
  }
  // The server-side history wins whenever it's at least as complete as what
  // the client resent — the client's copy still covers the gap where an
  // earlier turn's persist write failed (or hasn't landed yet, for a
  // client-persisted background turn racing this call).
  const clientHistory = body?.history ?? [];
  const serverHistory = conversation?.history ?? [];
  const history =
    serverHistory.length >= clientHistory.length
      ? serverHistory
      : clientHistory;

  // Prior turns are text-only (see SearchHistoryTurn) — never an image, and
  // never raw tool-call/result payloads, just what was said. Prepended
  // before the new turn's content so the model has conversational context
  // without the earlier photo(s) counting against this turn's token/attach
  // limits, and without needing to know its own past tool calls' shapes.
  const historyMessages: ModelMessage[] = history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
  // `let`, not `const`: the scope check below can narrow this to the
  // current request alone when the buyer has moved on to a different item
  // (requestRelation "new") — see that block for why the fix is dropping
  // the earlier turns rather than instructing the model to ignore them.
  // Every later callLLM in this file reads this same binding, so the
  // narrowing applies to the main call, its retries, and the description /
  // dual-intent reminder passes alike.
  let messages: ModelMessage[] = [
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
      // Seeded from BOTH copies since the Phase 1 follow-ups: the
      // conversation's persisted list (survives a refresh — the client's
      // resent copy is empty right after one) unioned with the client's
      // in-memory copy (which also carries client-side pushes the server
      // never saw, e.g. background-item phrasing), deduped in order,
      // capped from the end. sendFinal writes the final merged+pushed list
      // back to the conversation each turn.
      const recentStatuses: string[] = Array.from(
        new Set([
          ...(conversation?.recentStatuses ?? []),
          ...(body?.recentStatuses ?? []),
        ]),
      ).slice(-RECENT_STATUS_MEMORY);
      // Found live: "I need someone who can help fix my laptop. I also
      // need a plumber" — a genuine dual-intent turn — showed a "Searching
      // for 'plumber' near you…" status line before the buyer was ever
      // told two separate things had even been heard. Root cause: the AI
      // SDK's own multi-step tool loop actually RUNS every tool call the
      // model makes as part of resolving ONE `callLLM` invocation — when
      // the model calls both searchProducts AND searchStores in the same
      // turn (exactly what a dual-intent message makes it do), BOTH
      // execute for real, each pushing its own live status text, well
      // before this file ever gets to inspect the result and realize it's
      // dual-intent. There's no way to know that in advance — only after
      // the fact, once `outcome` comes back with both calls present.
      //
      // `bufferingStatuses` is the fix: while true, `push` holds each
      // call's candidate pool instead of streaming it, so anything a tool
      // says about EITHER item during this detection window can still be
      // discarded wholesale if it turns out to be a genuine dual-intent
      // turn (see the dual-intent branch below, which empties the buffer
      // entirely rather than flushing it — item A gets a fresh,
      // independent resolveSearchItem call afterward anyway, so nothing
      // buffered here is ever actually needed). If it ISN'T dual-intent,
      // the buffer is flushed in order right after that check (see below)
      // — bufferedPushCandidates holds CANDIDATE POOLS, not pre-picked
      // text, specifically so flushing later still runs each one through
      // pickAvoiding against `recentStatuses` as it stood AT THAT POINT,
      // identical to what plain live pushing would have produced.
      let bufferingStatuses = false;
      const bufferedPushCandidates: string[][] = [];
      const push = (candidates: string[]) => {
        if (bufferingStatuses) {
          bufferedPushCandidates.push(candidates);
          return;
        }
        const text = pickAvoiding(candidates, recentStatuses);
        recentStatuses.push(text);
        if (recentStatuses.length > RECENT_STATUS_MEMORY)
          recentStatuses.shift();
        controller.enqueue(encodeEvent({ type: "status", text }));
      };

      // Every "final" event goes through here (Phase 1,
      // docs/velte-ai-search-flow-plan.md): stamps the conversation id the
      // client should carry forward, enqueues, then persists this turn's
      // complete snapshot into the conversation — AWAITED, before the
      // stream closes, since Vercel gives no guarantee code after a closed
      // streaming response ever runs. A persist failure only logs: the
      // buyer already has their answer, and the next turn's client-resent
      // history covers the gap (see the serverHistory/clientHistory pick
      // above).
      // What THIS turn established about the request, read off the search
      // the model actually ran rather than re-interpreted from its prose.
      // Declared out here so sendFinal (below) can carry it into the goal
      // sheet from any exit path; an early exit simply leaves it empty.
      let goalUpdate: {
        maxBudgetNaira?: number | null;
        attributes?: string[];
      } = {};

      // Same reasoning as goalUpdate above: declared out here so sendFinal
      // can read it from ANY exit path, including the early ones that run
      // before the real assignment below (the off-topic decline fires at the
      // scope check, well before this is kicked off). An early exit simply
      // resolves to an empty list and the band falls back to Velte's own
      // prices — which is exactly the behaviour it had before.
      let bandOffersPromise: Promise<ExternalOffer[]> = Promise.resolve([]);

      // The fair-price band for a completed turn, or null.
      //
      // Attached HERE, in sendFinal, rather than at each of the four places
      // that build a final event: every exit path funnels through this
      // function, so one implementation covers the clarification path, the
      // dead-end path and the ordinary result path without any of them
      // having to remember. It also keeps the whole feature off the critical
      // path of producing an answer — by the time this runs the reply is
      // already written.
      //
      // ORDER MATTERS. The band is computed first (deterministic, free, no
      // network) and the quota is only spent once we know there is something
      // to show. Metering first would charge a buyer for turns that produced
      // no band at all, which is the kind of quiet unfairness nobody reports
      // and everybody feels.
      async function priceBandFor(
        event: Omit<
          Extract<SearchStreamEvent, { type: "final" }>,
          "conversationId" | "priceBand"
        >,
      ) {
        // Land, property, services: the band's core assumption (the same
        // object whoever sells it) is false, so there is no honest band to
        // draw. See priceBand.ts's UNBANDABLE_SECTOR.
        if (!isBandableQuery(message)) return null;
        // Two sources, merged, and they arrive by different routes:
        //   event.externalOffers — the listings the buyer can SEE and click,
        //     which only exist on a genuine dead end.
        //   bandOffersPromise   — the reference prices fetched in parallel
        //     purely to measure against, never rendered.
        // On a dead end the first is populated and the second usually is
        // too; deduped by url so the same listing can't be counted twice and
        // skew its own channel.
        const referenceOffers = await bandOffersPromise;
        const seen = new Set(event.externalOffers.map((o) => o.url));
        const offers = [
          ...event.externalOffers,
          ...referenceOffers.filter((o) => !seen.has(o.url)),
        ];
        const band = buildPriceBand({
          products: [...event.products, ...event.weakProducts],
          offers,
          query: itemTerm ?? message,
          // The buyer's own words, scanned for a price they say they were
          // quoted — "should I buy this?" answered off the same band, for no
          // extra call and no extra allowance. Passed raw rather than
          // pre-parsed: see buildPriceBand's own note on why the extraction
          // rules have to live beside the market they are measured against.
          message,
        });
        if (!band) return null;
        // Charged only once there is something to show — the band is
        // computed first (deterministic, free, no network) and the credit is
        // taken after. Charging first would bill turns that produced no band
        // at all, which is the kind of quiet unfairness nobody reports and
        // everybody feels.
        //
        // A refusal drops the BLOCK and nothing else: never an error, never a
        // quota event, never a failed turn. The buyer's answer already
        // succeeded and is already on its way to them.
        const paid = await chargeCredits({
          actorType,
          cookie: actorCookie,
          action: "band",
        });
        return paid.allowed ? band : null;
      }

      async function sendFinal(
        event: Omit<
          Extract<SearchStreamEvent, { type: "final" }>,
          "conversationId" | "priceBand"
        >,
      ): Promise<void> {
        // ── Charging, once the turn has actually delivered ─────────────
        //
        // Here rather than up front, so nothing is billed for work that
        // didn't happen: a turn that errors never reaches this function at
        // all, and one answered from the NEARBY-BUSINESS path is free —
        // `allowsNearbyBusinesses` is exactly the condition that skips the
        // external price lookup, so no Serper call was made and there is
        // nothing to have paid for.
        //
        // A dead end IS charged, deliberately: it still called Serper looking
        // for somewhere else to buy, which is the expensive part and is
        // genuinely useful work even when the answer is "not on Velte".
        //
        // Read off the event rather than a flag set upstream, because every
        // exit path funnels through here — the same reason the price band is
        // attached here. Guarded so the several early-exit callers can't bill
        // one turn twice.
        const answeredFromPlaces =
          event.externalStoreSuggestions.length > 0 &&
          event.externalOffers.length === 0;
        if (!turnCharged && !answeredFromPlaces) {
          turnCharged = true;
          // Not awaited into the reply's critical path and never able to
          // throw: a charge that failed costs Velte one credit's revenue,
          // where a charge that could fail the turn costs the buyer their
          // answer.
          void chargeCredits({
            actorType,
            cookie: actorCookie,
            action: turnAction,
          });
        }

        const full = {
          ...event,
          priceBand: await priceBandFor(event),
          conversationId: conversation?.conversationId ?? null,
        };
        controller.enqueue(encodeEvent(full));
        if (conversation && deviceId) {
          try {
            await appendSearchTurn({
              conversationId: conversation.conversationId,
              deviceId,
              buyerId: buyerAuth?.buyerId ?? null,
              turn: buildTurnSnapshot(full, message, imageUrl ?? null),
              // The merged-then-pushed list as it stands at turn end —
              // becomes the seed for the next turn (and the next session).
              recentStatuses,
              buyerLocation: locationUpdate,
              // The goal sheet's write side. `startsFreshRequest` is the
              // route's own already-vetoed boundary decision (structural
              // overrides included), not the raw classifier — the backend
              // uses it to decide whether to accumulate or wipe.
              // `goalUpdate` carries whatever this turn established.
              goal: {
                startsFreshRequest,
                itemTerm,
                ...goalUpdate,
              },
            });
          } catch (err) {
            console.error("[search] conversation persist failed:", err);
          }
        }
      }

      // Shared by every early-exit check below (off-topic decline, the
      // proactive location ask) — sends the SAME "final" shape a
      // genuinely empty/clarifying search turn would (no results,
      // toolCalled false) so the frontend renders this exactly like any
      // other plain-text reply/clarification, then closes the stream
      // itself (rather than relying on the try/finally further below,
      // which every caller here runs before) — this is the whole turn,
      // nothing else runs after it.
      async function sendBareFinal(
        reply: string,
        clarification: Clarification | null,
        // Set only by the watch short-circuit below. Every other caller of
        // this helper is answering with words alone.
        watchRequest: WatchCandidate[] | null = null,
      ) {
        await sendFinal({
          type: "final",
          reply,
          toolCalled: false,
          clarification,
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
          buyerRequestOffer: null,
          buyerRequestOffered: false,
          backgroundItems: [],
          dualIntentItemALabel: null,
          awaitingBuyerRequestReply: false,
          buyerRequestMatchQuery: null,
          recommendation: null,
          watchOffer: [],
          watchRequest,
          externalOffers: [],
        });
        controller.close();
      }

      // See looksLikeGibberishInput's own comment — a free, instant
      // decline for the one shape of off-topic input that's unambiguous
      // enough to catch without any model call at all. Runs before the
      // (slower, real) dedicated scope check just below so the obvious
      // case never pays for a whole extra LLM round trip.
      if (!imageUrl && looksLikeGibberishInput(message)) {
        await sendBareFinal(
          "That doesn't look like something I can search for — I'm a shopping assistant for Velte, here to help you find products, food, services, or vendors. What are you looking for?",
          null,
        );
        return;
      }

      // Reused by needsLocationButDidntAsk/searchedNationwideWithoutAsking
      // further below (their own reactive fallback checks) — moved up here
      // so the PROACTIVE gate right after the scope check can use them too,
      // without duplicating the history scan. See those two later call
      // sites for LOCATION_CLARIFY_PATTERN's own full doc comment.
      const LOCATION_CLARIFY_PATTERN =
        /\b(city|area|location|located|situated|whereabouts|neighbo(?:u)?rhood|which (?:state|town)|where (?:are|do) you|part of town)\b/i;
      const alreadyAskedLocationThisConversation =
        history.some(
          (turn) =>
            turn.role === "assistant" &&
            LOCATION_CLARIFY_PATTERN.test(turn.content),
        ) ||
        // Phase 5: the conversation's own settled location state — a
        // structural record of the answer, not a guess at it from prose.
        // Either a shared position or a deliberate "search without it"
        // means this question is answered and must never be re-asked, and
        // unlike the text scan above this stays correct even if the
        // asking turn has since aged out of the history window.
        Boolean(
          conversation?.buyerLocation &&
          (conversation.buyerLocation.declined ||
            conversation.buyerLocation.lat != null),
        );

      // The general off-topic case — see buildScopeCheckSystemPrompt's own
      // comment for why this is its OWN dedicated call, run first, before
      // anything else this turn touches (before the first status line,
      // before sectorClarifiers, before the location gate, before the main
      // model call). Also reports namesPlace and hasMultipleIntents — see
      // classifyScopeTool.ts's own comment for why both ride along on this
      // SAME call rather than a separate dedicated round trip each.
      //
      // Runs on ANY turn with real caption/message text, image attached or
      // not — text-only (scopeCheckMessages below deliberately drops the
      // image, see classifyScopeTool.ts's comment on why hasMultipleIntents
      // doesn't need it), so attaching an image never adds a second
      // vision-model call here. A BARE photo with no caption at all is
      // still skipped entirely (message is empty) — there's no text to
      // read intent count from, and systemPrompt.ts's own
      // photo-identification path already treats a bare image as a
      // first-class, single-item shopping signal on its own.
      //
      // inScope is only ever acted on when there's NO image this turn — a
      // photo is presumptively in scope regardless of how a thin caption
      // alone reads (a bare "check this out" next to a product photo could
      // easily misread as off-topic from text alone). `inScope ?? true`,
      // `namesPlace ?? false`, and `hasMultipleIntents ?? false` all fail
      // toward the safer default — if the classifier call itself errors, or
      // the model somehow returns without calling classifyScope at all, a
      // real buyer's genuine request must never be silently blocked, and a
      // single-item turn must never be wrongly split, over an
      // infrastructure hiccup. The main call's own embedded scope judgment
      // (buildSystemPrompt's own paragraph) and the downstream
      // isGenuineDualIntent heuristic are both still there as a second line
      // of defense either way.
      // ── Did they just take up a watch offer? ───────────────────────
      //
      // Runs BEFORE the scope check on purpose. "The first one" and "yes
      // please" are not shopping requests in their own right — the scope
      // check would rightly call them out of scope and answer with the
      // "I'm a shopping assistant" line, which would be a dead end on the
      // one turn where Velte itself asked the question.
      //
      // Gated on structured state, never on the text: `watchOffer` is only
      // present because SearchHome rendered that offer on the previous turn
      // (see SearchHistoryTurn). No live offer, no call, no cost.
      const liveWatchOffer = (() => {
        for (let i = history.length - 1; i >= 0; i--) {
          const turn = history[i];
          if (turn.role !== "assistant") continue;
          // Only the MOST RECENT assistant turn counts. An offer the buyer
          // has already talked past is not one a bare "yes" belongs to.
          return turn.watchOffer?.length ? turn.watchOffer : null;
        }
        return null;
      })();

      if (message && liveWatchOffer) {
        try {
          const watchResult = await callLLM(
            {
              system: buildWatchIntentPrompt(liveWatchOffer),
              messages: [{ role: "user", content: message }],
              tools: { classifyWatchIntent: classifyWatchIntentTool() },
              toolChoice: "required",
            },
            ["openai", "groq"],
            "watch-intent",
          );
          const verdict = watchResult.toolResults.find(
            (r) => r.toolName === "classifyWatchIntent",
          )?.output as
            | { wantsWatch: boolean; selectedNumbers: number[] }
            | undefined;

          if (verdict?.wantsWatch) {
            // Numbers back to real candidates, in code. An out-of-range or
            // duplicated number is simply dropped rather than trusted — the
            // model never touches the ids, so it cannot invent a target.
            const chosen: WatchCandidate[] = [];
            const seenNumbers = new Set<number>();
            for (const n of verdict.selectedNumbers ?? []) {
              if (!Number.isInteger(n) || seenNumbers.has(n)) continue;
              const candidate = liveWatchOffer[n - 1];
              if (!candidate) continue;
              seenNumbers.add(n);
              chosen.push(candidate);
            }
            // "Watch them" with nothing resolved means all of them — the
            // buyer said yes to the offer as a whole, and the offer was at
            // most three items they had just been shown.
            const selected = chosen.length ? chosen : liveWatchOffer;

            // The reply is deliberately EMPTY. Everything the buyer sees on
            // this turn is narrated by the frontend as the flow actually
            // progresses (signing in, checking the plan, creating each
            // watch) — a canned "sure, watching those" written here would be
            // a promise made before any of it had happened, and wrong the
            // moment their plan refuses.
            await sendBareFinal("", null, selected);
            return;
          }
        } catch (err) {
          // Fails toward the ordinary pipeline: an unavailable classifier
          // must never swallow a message. Worst case the buyer's "yes" is
          // read as a fresh search and they say it again.
          console.error("[watch-intent] classify failed:", err);
        }
      }

      let namesPlace = false;
      let hasMultipleIntents = false;
      // The scope check's own understanding of WHAT is being sought (see
      // classifyScopeTool's own comment) — the inputs to the bare-query
      // attribute gate further below. All three fail toward "don't ask":
      // a missing itemTerm or a true hasSpecificDetails both mean the gate
      // stays out of the way, which is the safe direction — a skipped
      // question costs a slightly thinner search, a wrong or repeated one
      // costs the buyer's patience.
      let itemTerm: string | null = null;
      let seekingKind: SearchIntentKind = "unclear";
      let hasSpecificDetails = true;
      // Defaults to "refinement" — the pre-signal behavior (full context
      // carries over). Failing toward "new" would mean a classifier
      // hiccup silently amputates a genuine mid-request follow-up, which
      // is far more disruptive than the leakage this signal exists to
      // stop.
      let requestRelation: RequestRelation = "refinement";
      if (message) {
        try {
          const scopeCheckMessages: ModelMessage[] = imageUrl
            ? [...historyMessages, { role: "user", content: message }]
            : messages;
          const scopeResult = await callLLM(
            {
              system: buildScopeCheckSystemPrompt(),
              messages: scopeCheckMessages,
              tools: { classifyScope: classifyScopeTool() },
              toolChoice: "required",
            },
            ["openai", "groq"],
            "scope-check",
          );
          const scopeOutput = scopeResult.toolResults.find(
            (r) => r.toolName === "classifyScope",
          )?.output as
            | {
                inScope: boolean;
                namesPlace: boolean;
                hasMultipleIntents: boolean;
                itemTerm: string | null;
                seekingKind: SearchIntentKind;
                requestRelation: RequestRelation;
                hasSpecificDetails: boolean;
              }
            | undefined;
          if (scopeOutput?.inScope === false && !imageUrl) {
            await sendBareFinal(
              "That doesn't look like something I can search for — I'm a shopping assistant for Velte, here to help you find products, food, services, or vendors. What are you looking for?",
              null,
            );
            return;
          }
          namesPlace = scopeOutput?.namesPlace ?? false;
          hasMultipleIntents = scopeOutput?.hasMultipleIntents ?? false;
          itemTerm = scopeOutput?.itemTerm?.trim() || null;
          seekingKind = scopeOutput?.seekingKind ?? "unclear";
          requestRelation = scopeOutput?.requestRelation ?? "refinement";
          hasSpecificDetails = scopeOutput?.hasSpecificDetails ?? true;
        } catch (err) {
          console.error("[search] scope check failed, failing open:", err);
        }
      }

      // Google Places is a SERVICE-only fallback (2026-08-26) — see
      // allowsNearbyBusinesses in sectorClarifiers.ts for the reasoning.
      // The scope check already read the buyer's intent this turn, which
      // is a much better signal than keyword-matching the query, so it
      // decides here for every search this turn; "unclear" hands the
      // decision back to each call's own query text (undefined).
      const allowNearbyBusinesses =
        seekingKind === "get_service"
          ? true
          : seekingKind === "buy_item"
            ? false
            : undefined;

      // ── Outside prices, for the FAIR-PRICE BAND only (2026-08-31) ───────
      //
      // Started here, unawaited, and that placement is the whole point: this
      // runs in parallel with retrieval, so by the time sendFinal needs it
      // the answer is usually already back and the buyer waits no longer
      // than before. Awaiting it down in priceBandFor would add a Serper
      // round trip to every turn's critical path.
      //
      // TWO THINGS THIS IS NOT, both deliberate:
      //
      // 1. NOT rendered. These never reach `externalOffers` on the final
      //    event, which is what draws the "buy it on Jumia" cards. Those
      //    still appear on genuine dead ends ONLY (see offersForDeadEnd).
      //    On a search that found Velte vendors, showing outside sellers as
      //    clickable options would route the buyer away from the vendor who
      //    pays for the lead — the objection that shaped this design. The
      //    prices are used as a REFERENCE to measure against, nothing more.
      //
      // 2. NOT a general search log. Nothing is persisted; the offers live
      //    for the length of this request and are then gone.
      //
      // Before this, the band could only ever see Velte's own vendors on a
      // successful search — one column, no comparison, and the "buying local
      // saves you ₦25,000" line (the entire point) could never fire except
      // on turns that found nothing.
      //
      // COST LEVER: this is one Serper call per bandable product search, and
      // that quota is 2,500/month across the whole platform. If it starts
      // running out, narrow the gate here — not the band itself.
      const bandQuery = (itemTerm || message).trim();
      bandOffersPromise =
        bandQuery &&
        hasExternalConnectors() &&
        isBandableQuery(bandQuery) &&
        // Services have no comparable market price — a plumber is not a
        // commodity — so they are excluded here for the same reason
        // priceBand.ts excludes land.
        !allowsNearbyBusinesses(bandQuery, allowNearbyBusinesses)
          ? fetchExternalOffers({ query: bandQuery }).catch((err) => {
              // Never surfaced and never fatal: the band simply falls back
              // to whatever channels it does have, exactly as it behaved
              // before this existed.
              console.error("[search] band price lookup failed:", err);
              return [] as ExternalOffer[];
            })
          : Promise.resolve([]);

      // A NEW request starts from a clean slate. Found live: a buyer who
      // had answered an earlier clarifying round with "Infinix", "black",
      // "brand new" then typed "Where can I get a phone" and got a search
      // for "Infinix phone black brand new" — and even after correcting
      // the brand, "black brand new" survived, because nothing ever
      // declared the previous request finished. History is one flat
      // transcript, and the system prompt tells the model a clarification
      // answer is "more context for the same request", with no boundary
      // saying where one request ends.
      //
      // The fix is structural rather than instructional, same as every
      // other reliability fix in this file: the earlier turns are simply
      // not sent, so there is nothing to inherit — a prompt asking the
      // model to please ignore context it can still see is exactly the
      // kind of request it has been observed to disregard. Deliberately
      // narrow: only what the MODEL sees is reset. The conversation is
      // still fully persisted (rehydrate and the on-screen thread are
      // untouched), the buyer's LOCATION still stands (that describes the
      // buyer, not the request — see the location marker computed from
      // full history above), and a "refinement"/"answer" turn keeps
      // everything exactly as before.
      // Structural veto over the classifier — NOT a belt-and-braces
      // nicety. The eval (npm run eval:search) measured requestRelation at
      // 55%, with the "answer" cases failing hardest: "Shared my location"
      // and "yes please" both came back "new". Slicing history on those
      // would erase the very request the buyer is mid-way through
      // answering — Velte would ask where they are, then forget what they
      // wanted. The client already KNOWS structurally when a message is a
      // continuation (SearchHome sets isContinuation for clarification
      // answers, location shares, and name/OTP submissions), and a pending
      // reach-out offer is recorded on the last turn itself. A known fact
      // beats a model's reading of it, so these override the classifier.
      const isStructuralContinuation =
        Boolean(body?.isContinuation) ||
        history.at(-1)?.awaitingBuyerRequestReply === true;
      const startsFreshRequest =
        requestRelation === "new" &&
        historyMessages.length > 0 &&
        !isStructuralContinuation;
      if (startsFreshRequest) {
        messages = [{ role: "user", content }];
      }

      // ── The goal sheet's two locks ────────────────────────────────────
      // A remembered constraint (today: the budget ceiling) may only be
      // applied when BOTH agree this is still the same request:
      //   1. the boundary decision above says it isn't a new one, and
      //   2. the sheet's own item still matches what's being asked about.
      // Lock 2 exists because lock 1 is a model judgment measured at 91%
      // (npm run eval:search) — a rare misread must not be able to put a
      // ₦700k PS5 ceiling on a fridge search, where the buyer would simply
      // see fewer results and never learn why. The check is deliberately
      // crude and predictable: same term, or one containing the other, so
      // "PS5" still covers "PS5 Slim" while "fridge" matches nothing about
      // a PS5. A budget named in the CURRENT message outranks both locks,
      // and is handled by the model's own tool call rather than here.
      const storedGoal = conversation?.task ?? null;
      const sameItemAsSheet = (() => {
        const a = storedGoal?.itemTerm?.trim().toLowerCase();
        const b = itemTerm?.trim().toLowerCase();
        if (!a || !b) return false;
        return a === b || a.includes(b) || b.includes(a);
      })();
      const sheetApplies = !startsFreshRequest && sameItemAsSheet;
      const rememberedBudget = sheetApplies
        ? (storedGoal?.maxBudgetNaira ?? null)
        : null;

      // hasMultipleIntents overrides — the classifier alone has produced
      // false dual-intent splits (found live: photo + "where can I find
      // this" → location share → polo vs "clothing store"). Two cases the
      // current message's own text can never name two needs:
      //
      // 1. Photo + empty/demonstrative caption — always one item (the photo).
      // 2. Content-free continuation ("Shared my location", bare yes/ok) —
      //    re-derive from the last substantive user message via the same
      //    cheap text heuristic retryDualIntentReminder already trusts,
      //    never from classifying the canned continuation string itself.
      if (
        imageUrl &&
        (!message.trim() || PHOTO_REFERRING_CAPTION.test(message.trim()))
      ) {
        hasMultipleIntents = false;
      } else if (
        isSharedLocationMessage(message) ||
        isAcknowledgementReply(message)
      ) {
        const priorText = lastSubstantiveUserMessage(history);
        hasMultipleIntents = Boolean(
          priorText && DUAL_INTENT_TEXT_PATTERN.test(priorText),
        );
      }

      // The proactive location gate — per explicit request, location must
      // be asked EVERY time it's still missing, on any turn, not just the
      // first — never left for the main call's own location gate to
      // (unreliably) enforce mid-search. Found live: a genuine search
      // ("fix my iPhone 14 Pro Max") ran nationwide and came back with a
      // real dead-end reply, without ever asking for location first —
      // route.ts's existing REACTIVE fallbacks for this
      // (needsLocationButDidntAsk/searchedNationwideWithoutAsking, both
      // further below) only fire when the search comes back with
      // absolutely nothing at all; a turn that found even a thin result
      // (an external Google Places suggestion, say) was deliberately left
      // alone by an earlier, since-reversed design decision ("a real find
      // isn't thrown away for a location question"). This gate runs
      // BEFORE any search happens at all, so that tension no longer
      // applies — there's nothing found yet to weigh against asking.
      // Skipped when the buyer's device location is already known, this
      // message (or an earlier one) already named a place, or location's
      // already been asked this conversation (an answer either way —
      // shared or declined — routes through submitMessage directly, never
      // back through this gate; see SearchHome.tsx's own comment on why).
      if (
        message &&
        !imageUrl &&
        !body?.buyerLocation &&
        !namesPlace &&
        !alreadyAskedLocationThisConversation
      ) {
        try {
          const locationOnlySystem = `The buyer just asked: "${message}". Their location is unknown — neither a device location nor a named place exists for this search, and this search needs one. Call the askClarifyingQuestion tool with kind: "location" and a short, natural, ONE-sentence \`question\` asking for their location so you can find vendors actually near them — make clear this is only to find nearby vendors, never to track them. Do not ask about anything else this turn, and do not call any other tool.`;
          const locationResult = await callLLM(
            {
              system: locationOnlySystem,
              messages,
              tools: { askClarifyingQuestion: askClarifyingQuestionTool() },
              toolChoice: "required",
            },
            ["openai", "groq"],
            "location-only",
          );
          const locationOutcome = extractOutcome(locationResult);
          if (locationOutcome.clarifyCandidate?.kind === "location") {
            await sendBareFinal(locationOutcome.clarifyCandidate.question, {
              kind: "location",
              question: locationOutcome.clarifyCandidate.question,
            });
            return;
          }
          // Extremely unlikely given toolChoice: "required" plus a
          // single-tool set, but if the forced call somehow didn't produce
          // a location clarify, fall through to the normal pipeline below
          // rather than silently dropping the buyer's turn.
        } catch (err) {
          console.error(
            "[search] proactive location check failed, falling through:",
            err,
          );
        }
      }

      // The deterministic bare-query ATTRIBUTE gate — the details sibling
      // of the proactive location gate above, and the same lesson applied:
      // leaving "ask about missing details" to the model's own judgment
      // (buildSystemPrompt's sectorNote, gated to first-turn-with-location)
      // meant a bare "laptop" usually searched immediately with nothing to
      // rank on. Now a query naming essentially just the item
      // (looksLikeBareQuery) with a confidently-detected sector gets ONE
      // code-enforced clarifying round — rendered skippable (see the
      // Clarification type): details help matching but must never be a
      // wall, so the buyer can answer through the composer or tap
      // "Skip — just search" and proceed. Runs AFTER the location gate on
      // purpose (location first, then details); fires at most once per
      // conversation (the history scan below, same technique as
      // alreadyAskedLocationThisConversation).
      //
      // On a continuation turn this only ever fires for the LOCATION
      // gate's own answers (shared or declined) — resolving the original
      // request via lastSubstantiveUserMessage — never for a reply to any
      // other question (including this gate's own: hijacking an answer
      // turn to re-ask would loop the buyer).
      const ATTRIBUTE_CLARIFY_PATTERN =
        /mention whichever of these matter to you/i;
      // Request-scoped, unlike the LOCATION marker above which stays
      // buyer-scoped: having asked about the last item's details says
      // nothing about the new one, so a fresh request earns a fresh ask
      // (once). This is the same buyer-vs-request distinction the history
      // reset above turns on.
      const alreadyAskedAttributesThisConversation =
        !startsFreshRequest &&
        history.some(
          (turn) =>
            turn.role === "assistant" &&
            ATTRIBUTE_CLARIFY_PATTERN.test(turn.content),
        );
      if (
        // Every input below comes from the scope check's own reading of the
        // request (itemTerm/seekingKind/hasSpecificDetails), not from
        // counting tokens in the raw text: `itemTerm` is the clean noun
        // phrase to ask about AND to detect a sector from (so a lead-in
        // sentence is never quoted back at the buyer, and detection sees
        // "phone", not "where can i get a phone"), and
        // `hasSpecificDetails` is the model's judgment — with full
        // conversation context — of whether anything distinguishing has
        // been said yet.
        itemTerm &&
        !hasSpecificDetails &&
        !imageUrl &&
        // A multi-need message must reach the dual-intent split downstream
        // — clarifying attributes for one of the needs would swallow the
        // other entirely.
        !hasMultipleIntents &&
        !alreadyAskedAttributesThisConversation
      ) {
        const overrides = await getAttributeSchemaOverrides();
        const bareClarifiers = getSectorClarifiers(
          itemTerm,
          undefined,
          overrides,
          // Keeps the questions on the right side of a "both" sector: a
          // buyer BUYING a phone is asked about Model/Storage, never
          // Turnaround Time or Repair Warranty (found live — the bug this
          // whole redesign addresses).
          seekingKind,
        );
        // The floor under the gate (2026-08-26). Sector detection reads
        // business-type LABELS, so the item long tail misses constantly —
        // "power bank", "blender", "inverter", "wig" all detected NOTHING,
        // and a null here used to mean the gate simply didn't run. Found
        // live on "I need a power bank": no question asked, straight to a
        // nationwide search, straight to a dead end — the buyer sees a
        // search engine, not an agent that worked the request. The
        // sector-specific pool is still strictly preferred; this only
        // decides between "ask something generic" and "ask nothing",
        // where asking nothing was never the better answer.
        // Generated for THIS item first, presets second (2026-08-26).
        // Splitting the preset tables fixed laptops, then televisions, and
        // would never have finished: a sector table is always coarser than
        // the thing somebody actually typed, so its examples drift for
        // every item it wasn't written for. Asking about the real item
        // closes that by construction, for a product or service nobody
        // anticipated as much as for one that was.
        //
        // The sector's own field names ride along as a hint rather than
        // being replaced outright — that's what keeps the operator tuning
        // in the DB overrides layer (Phase 2) alive instead of silently
        // bypassed — and any failure falls straight back to the presets,
        // so this can improve the question but never remove it.
        const generated = await generateItemClarifiers({
          itemTerm,
          intent: seekingKind,
          presetHint: bareClarifiers?.fields.map((f) => f.name),
        });
        const fields =
          generated ??
          bareClarifiers?.fields ??
          getGeneralClarifierFields(seekingKind, undefined, overrides);
        if (fields.length) {
          const question = buildClarifyingQuestion(itemTerm, fields);
          await sendBareFinal(question, {
            kind: "text",
            question,
            skippable: true,
          });
          return;
        }
      }

      // Sent live, before buffering ever turns on — this happens before
      // any tool has even been given a chance to run, so there's nothing
      // to protect it from.
      push(
        understandingRequestPhrase(
          Boolean(imageUrl),
          message,
          Boolean(body?.isContinuation),
        ),
      );

      // Populated by searchProductsTool's execute(), outside the model's own
      // return value — see that tool's weakResultsOut doc comment. Declared
      // here (not inside the tool call) since it needs to survive past
      // callLLM to build the final event below.
      const weakResultsRef: { current: VendorMatch[] } = { current: [] };

      // Phase 5: the buyer's own coordinates, named — this turn's if the
      // client just resolved one, otherwise whatever the conversation
      // already had stored (so it survives a refresh along with the
      // coordinates themselves). Display only: it reaches the search tools
      // purely so a status line can say "near Independence Layout, Enugu"
      // rather than "your area", and never influences what is searched.
      const locationLabel =
        body?.locationPlaceName?.trim() ||
        conversation?.buyerLocation?.placeName ||
        undefined;

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
        message && !imageUrl && !history.length && body?.buyerLocation
          ? getSectorClarifiers(
              // The clean noun phrase when the scope check produced one —
              // same reasoning as the attribute gate above: detection on
              // "phone" is far more reliable than on a whole sentence.
              itemTerm || message,
              undefined,
              // Phase 2: DB-tuned question schemas — cached, hard-capped
              // wait, degrades to the in-code presets (see
              // attributeSchemas.ts). Fetched only on the turns that can
              // actually ask (this exact gate), never unconditionally.
              await getAttributeSchemaOverrides(),
              seekingKind,
            )
          : null;

      /** Online listings for a dead-ended reach-out. Both no_match paths
       *  below used to fall back to Google Places alone, which now only
       *  answers SERVICE requests (see allowsNearbyBusinesses) — so a buyer
       *  whose PRODUCT request reached nobody was left with a bare
       *  "couldn't find anyone" and an empty screen. This is the same
       *  consolation an ordinary product dead end already gets. Never
       *  throws; an empty list just means the turn ends as it did before. */
      const offersForDeadEnd = async (term: string) => {
        const q = term.trim();
        if (
          !q ||
          !hasExternalConnectors() ||
          allowsNearbyBusinesses(q, allowNearbyBusinesses)
        ) {
          return [] as ExternalOffer[];
        }
        try {
          push(checkingElsewherePhrase(q));
          return await fetchExternalOffers({ query: q });
        } catch (err) {
          console.error("[search] dead-end external offers failed:", err);
          return [] as ExternalOffer[];
        }
      };
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
            locationLabel,
            rememberedBudget,
            allowNearbyBusinesses,
          ),
          searchStores: searchStoresTool(
            body?.buyerLocation,
            push,
            locationLabel,
            allowNearbyBusinesses,
          ),
          getVendorProducts: getVendorProductsTool(push),
          // Takes only `buyerAuth` now: the tool no longer creates the
          // request (the phone must be confirmed first, which only the
          // browser can do), so location/image/matchQuery all moved to the
          // frontend's own POST /api/buyer-requests.
          createBuyerRequest: createBuyerRequestTool(buyerAuth),

          offerBuyerRequest: offerBuyerRequestTool(),
        };
        const system = buildSystemPrompt(
          Boolean(body?.buyerLocation),
          sectorClarifiers,
          // Only handed over once BOTH goal-sheet locks pass — a new
          // request, or a sheet about a different item, contributes
          // nothing (see sheetApplies).
          sheetApplies && storedGoal
            ? {
                itemTerm: storedGoal.itemTerm,
                maxBudgetNaira: storedGoal.maxBudgetNaira,
                cheapestSeenNaira: storedGoal.cheapestSeenNaira,
                shownCount: storedGoal.shownProductIds?.length ?? 0,
              }
            : null,
        );
        // "openai-strong" (gpt-5-mini, low reasoning effort — see
        // router.ts's own PROVIDERS comment) is the primary for every call
        // that shares this order: the main tool-calling call below, the
        // agreement-only short-circuit, and their retries — the actual
        // multi-step, many-instruction decisions this whole file's worth of
        // deterministic guardrails grew up around. Falls through to plain
        // "openai" (gpt-4o-mini) on a 429/503 before ever reaching Groq, so
        // a rate limit doesn't drop straight to the weakest tier. Groq is
        // text-only — never route an image query to it, and gpt-5-mini is
        // multimodal same as gpt-4o-mini was, so the image chain doesn't
        // need a separate model tier of its own.
        const providerOrder: ("openai-strong" | "openai" | "groq")[] = imageUrl
          ? ["openai-strong", "openai"]
          : ["openai-strong", "openai", "groq"];

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
        const lastHistoryTurn = history.at(-1);
        const isAnsweringOffer =
          lastHistoryTurn?.role === "assistant" &&
          lastHistoryTurn.awaitingBuyerRequestReply === true &&
          !isOfferDeclineReply(message) &&
          // Same class of leak the history reset above fixes: this treats
          // ANY non-decline as agreement, so a buyer who ignores the offer
          // and simply asks for something else ("where can I get a phone")
          // would be signed up for a reach-out about the PREVIOUS item.
          // Walking away from an offer is not agreeing to it.
          requestRelation !== "new";

        if (isAnsweringOffer) {
          // Pre-check — per explicit request, verify a real vendor
          // actually exists BEFORE ever asking the buyer for their name,
          // rather than discovering it only after they've invested a name
          // into the exchange. Found live: the offer above gets triggered
          // by a short, clean sector-match term ("wedding decoration
          // services"), but createBuyerRequest's own matching re-embeds
          // and searches `description` instead — a longer, model-authored
          // summary combining item + budget + timeframe + more, which can
          // legitimately score below match threshold in vector search
          // even for the SAME vendor the short term matched cleanly. A
          // buyer agreed, gave their name, and still landed on "couldn't
          // find anyone to contact" — this runs that exact same search a
          // step earlier, on the exact query createBuyerRequest will
          // actually use, so a doomed offer never gets that far. See
          // buildRequestDescriptionTool's own comment for the full story.
          //
          // Also reuse `buyerRequestMatchQuery` from the offer turn when
          // present — that short term is what justified the offer; the
          // long description alone often no_matches the same vendors.
          const offerMatchQuery =
            typeof lastHistoryTurn.buyerRequestMatchQuery === "string"
              ? lastHistoryTurn.buyerRequestMatchQuery.trim()
              : "";

          const descriptionResult = await callLLM(
            {
              system: buildDescriptionOnlySystemPrompt(message),
              messages,
              tools: {
                buildRequestDescription: buildRequestDescriptionTool(),
              },
              toolChoice: "required",
              stopWhen: stepCountIs(1),
            },
            providerOrder,
            "description-only",
          );
          const candidateDescription = (
            descriptionResult.toolResults.find(
              (r) => r.toolName === "buildRequestDescription",
            )?.output as { description?: string } | undefined
          )?.description?.trim();

          // Fails OPEN (treated as "a match exists") on any hiccup — an
          // infrastructure error in this EXTRA verification step must
          // never block a buyer from an otherwise-working reach-out flow;
          // the existing no_match handling further below is still there
          // as a real backstop if this optimistic assumption turns out
          // wrong.
          let hasRealMatch = true;
          let preCheckExternalSuggestions: NearbyBusiness[] = [];
          const preCheckQueries = [
            offerMatchQuery,
            candidateDescription ?? "",
          ].filter((q, i, arr) => q.length > 0 && arr.indexOf(q) === i);

          if (preCheckQueries.length) {
            try {
              hasRealMatch = false;
              for (const q of preCheckQueries) {
                if (
                  await hasContactableVendorsForQuery(q, body?.buyerLocation)
                ) {
                  hasRealMatch = true;
                  break;
                }
              }
              if (!hasRealMatch) {
                // Best-effort Places for the description (or match query)
                // when nothing on Velte is contactable.
                const nearbyProbe = await searchProductsCore(
                  {
                    product: candidateDescription || offerMatchQuery || "that",
                  },
                  { buyerLocation: body?.buyerLocation, allowNearbyBusinesses },
                );
                preCheckExternalSuggestions =
                  "results" in nearbyProbe
                    ? nearbyProbe.externalSuggestions
                    : [];
              }
            } catch (err) {
              console.error(
                "[search] buyer-request pre-check failed, failing open:",
                err,
              );
              hasRealMatch = true;
            }
          }

          if (!hasRealMatch && (candidateDescription || offerMatchQuery)) {
            const offer: BuyerRequestOffer = {
              status: "no_match",
              description: candidateDescription || offerMatchQuery || "that",
            };
            const preCheckOffers = await offersForDeadEnd(
              offerMatchQuery || candidateDescription || "",
            );
            await sendFinal({
              type: "final",
              reply: buyerRequestStatusReply(offer),
              toolCalled: false,
              clarification: null,
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
              externalStoreSuggestions: preCheckExternalSuggestions,
              vendorProducts: [],
              vendorProductsStore: null,
              buyerRequestOffer: offer,
              buyerRequestOffered: false,
              backgroundItems: [],
              dualIntentItemALabel: null,
              // Terminal — never asked for a name, so there's no open
              // exchange for the buyer's next message to route back
              // into.
              awaitingBuyerRequestReply: false,
              buyerRequestMatchQuery: null,
              recommendation: null,
              watchOffer: [],
              watchRequest: null,
              externalOffers: preCheckOffers,
            });
            return;
          }

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
                createBuyerRequest: createBuyerRequestTool(buyerAuth),
              },
              toolChoice: "required",
              stopWhen: stepCountIs(1),
            },
            providerOrder,
            "agreement-only",
          );
          const agreementOutcome = extractOutcome(agreementResult);
          const agreementReply = agreementOutcome.clarification
            ? agreementOutcome.clarification.question
            : agreementOutcome.buyerRequestOffer
              ? buyerRequestStatusReply(agreementOutcome.buyerRequestOffer)
              : sanitizeReply(agreementResult.text) ||
                "Sorry, something went wrong there — let me know and I'll try again.";

          // Both of these used to be computed here, for the case where
          // createBuyerRequest came back "no_match" (it found zero vendors
          // to notify): a Google Places fallback plus off-Velte offers,
          // revealed in this same short-circuited turn since no AI turn
          // re-runs on this path.
          //
          // The tool can no longer return "no_match" (2026-08-26) — it does
          // not create anything any more, it only decides which number the
          // frontend must collect. The request is created by the browser's
          // own POST /api/buyer-requests once the phone is settled, and the
          // zero-vendor fallback moved with it: SearchHome's
          // finishBuyerRequest calls /api/buyer-requests/nearby on
          // `!created` and renders exactly the same suggestions through the
          // turn's ordinary externalStoreSuggestions branch. Nothing was
          // lost, so what stood here is gone rather than left unreachable.
          const agreementExternalSuggestions: NearbyBusiness[] = [];
          const agreementOffers: ExternalOffer[] = [];

          await sendFinal({
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
            externalStoreSuggestions: agreementExternalSuggestions,
            vendorProducts: [],
            vendorProductsStore: null,
            buyerRequestOffer: agreementOutcome.buyerRequestOffer,
            buyerRequestOffered: false,
            backgroundItems: [],
            dualIntentItemALabel: null,
            // True only for the intermediate name-ask (still an open
            // exchange, the buyer's next reply needs routing back here
            // too) — false once createBuyerRequest actually resolved
            // (created/needs_identity/no_match/error are all terminal
            // for THIS mechanism; needs_identity hands off to
            // BuyerRequestOfferWidget's own phone/OTP flow instead,
            // which never goes through another /api/search round-trip).
            awaitingBuyerRequestReply: agreementOutcome.clarification !== null,
            // Keep the offer's short match query alive across the
            // name-ask turn (and needs_identity) so create still uses it.
            buyerRequestMatchQuery: offerMatchQuery || null,
            recommendation: null,
            watchOffer: [],
            watchRequest: null,
            externalOffers: agreementOffers,
          });
          return;
        }

        // From here until the dual-intent check below resolves one way or
        // the other, every push() call — including every real tool
        // execution's own status text (searchProducts/searchStores can
        // both genuinely run for real inside the SAME model turn — see
        // bufferingStatuses' own comment above) — gets held rather than
        // streamed live.
        bufferingStatuses = true;

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
          "main-loop",
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
        // tool instead. LOCATION_CLARIFY_PATTERN/alreadyAskedLocationThisConversation
        // themselves now live up near the proactive location check, above —
        // this block and the reactive retries below it just reuse them via
        // closure.
        //
        // Guards needsLocationButDidntAsk further below — a genuinely
        // off-topic message (see systemPrompt.ts's own "IN SCOPE" rule —
        // random noise, a general-knowledge question, anything unrelated
        // to shopping) legitimately produces the exact same shape a
        // "forgot to ask for location" turn does: no search tool called,
        // no clarifyCandidate, buyer location still unknown. Found live: a
        // buyer pasting a bcrypt hash got a correct off-topic decline from
        // the model, which needsLocationButDidntAsk then silently
        // discarded and overrode with a forced "share your location"
        // ask — nonsensical for a message that was never a shopping
        // request in the first place. Matched against the model's own
        // reply text loosely, not verbatim (systemPrompt.ts's own
        // "shopping assistant... can't help with that" line is guidance,
        // not a fixed script the model is required to quote). Largely
        // superseded by the dedicated scope check above (which now kills an
        // off-topic message before the main call ever runs at all), kept as
        // a second line of defense for whatever that check's own fail-open
        // path misses.
        const OFF_TOPIC_DECLINE_PATTERN =
          /\b(shopping assistant|can'?t help (?:you )?with that|not something i can help|outside (?:of )?what i (?:can|could) help)\b/i;
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
              "main-loop-retry",
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
                "main-loop-retry-dual",
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
            "location-retry",
          );
          return { retryResult, retryOutcome: extractOutcome(retryResult) };
        }

        const needsLocationButDidntAsk =
          !body?.buyerLocation &&
          !alreadyAskedLocationThisConversation &&
          !outcome.productCall &&
          !outcome.storeCall &&
          !outcome.hasUsefulResults &&
          outcome.clarifyCandidate?.kind !== "location" &&
          !OFF_TOPIC_DECLINE_PATTERN.test(result.text ?? "");

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
          const priorText = lastSubstantiveUserMessage(history);
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
              "dual-reminder-retry",
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
        // Shared tail for every dual-intent shape below (product+store,
        // store+store, product+product): discards whatever this turn's
        // real tool calls already pushed into the status buffer (see
        // bufferingStatuses' own comment up top — both sides' results are
        // deferred to whichever the buyer picks, via SearchHome.tsx's own
        // direct POST /api/search/resolve-item, never this initial pass),
        // narrates the split, and sends the item_pick clarification. Each
        // caller's own job is only to detect its shape and build the two
        // items/labels — this is what used to be duplicated three times
        // (once per shape) before being pulled out here. Always the last
        // thing a caller does — every call site immediately `return`s
        // right after.
        async function emitDualIntentSplit(
          itemA: BackgroundSearchItem,
          itemB: BackgroundSearchItem,
          labelA: string,
          labelB: string,
        ) {
          bufferedPushCandidates.length = 0;
          bufferingStatuses = false;

          // A generic "two things heard" status, never naming either
          // side's own search activity or which comes first — per
          // explicit request (2026-08-20 redesign, replacing an earlier
          // "product side always goes first" convention): the buyer picks
          // which to resolve first via the two options on the item_pick
          // clarification below, not the app.
          push(splittingRequestPhrase(labelA, labelB));

          const pickQuestion = pickAvoiding(
            itemPickQuestionPhrase(labelA, labelB),
            [],
          );
          await sendFinal({
            type: "final",
            reply: pickQuestion,
            // Mirrors how an ordinary askClarifyingQuestion turn behaves
            // (see the tail of this handler below) — a plain message
            // bubble, not the "genuine dead end" Compass card, since
            // there's a real next step on the table (the pick itself).
            toolCalled: false,
            clarification: {
              kind: "item_pick",
              question: pickQuestion,
              options: [
                { item: itemA, label: labelA },
                { item: itemB, label: labelB },
              ],
            },
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
            buyerRequestOffer: null,
            buyerRequestOffered: false,
            backgroundItems: [],
            dualIntentItemALabel: null,
            // Answering this never goes through /api/search at all
            // (SearchHome.tsx resolves the pick directly) — there's no
            // "buyer's next message" for this short-circuit to route, so
            // this stays false, unlike a real reach-out offer.
            awaitingBuyerRequestReply: false,
            buyerRequestMatchQuery: null,
            recommendation: null,
            watchOffer: [],
            watchRequest: null,
            externalOffers: [],
          });
        }

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
            hasMultipleIntents &&
            isGenuineDualIntent(
              dualProductInput.product,
              dualStoreInput.businessType,
            ) &&
            !isProductToCategoryStoreCascade(
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
            const storeTerm = dualStoreInput.businessType;
            // Plain display labels for each side — the product side mirrors
            // SearchHome.tsx's own backgroundItemLabel product branch
            // (product + attributes joined); the store side is just the
            // business type, same as that same function's store branch.
            // Used only for buyer-facing wording below (the splitting
            // status line, the pick question, and each pick option's own
            // label) — never fed into the actual search calls.
            const productLabel = buildProductTerm(
              dualProductInput.product,
              dualProductInput.attributes,
            );
            const storeLabel = storeTerm;

            const productItem: BackgroundSearchItem = {
              type: "product",
              product: dualProductInput.product,
              attributes: dualProductInput.attributes,
              location: dualLocation,
            };
            const storeItem: BackgroundSearchItem = {
              type: "store",
              businessType: storeTerm,
              location: dualLocation,
            };

            await emitDualIntentSplit(
              productItem,
              storeItem,
              productLabel,
              storeLabel,
            );
            return;
          }
        }

        // The OTHER two dual-intent shapes: the SAME tool called twice in
        // one turn for two genuinely different needs — never one
        // searchProducts + one searchStores. The branch above can never
        // see either of these — its own precondition requires BOTH
        // outcome.productCall AND outcome.storeCall, but a message naming
        // two separate professions/business types ("wedding decorators"
        // and "a plumber") makes the model call searchStores TWICE, not
        // once each way — outcome.productCall stays undefined the whole
        // turn (see the .findLast comment on productCall/storeCall above,
        // which already flagged this exact gap: "e.g. 'fix my laptop' AND
        // 'a caterer for my wedding' are both searchStores calls ...
        // isGenuineDualIntent's own precondition never even sees this as
        // dual-intent"). The same applies symmetrically to two PHYSICAL
        // products named in one message ("a laptop and also wireless
        // earbuds") — both go through searchProducts, never searchStores.
        //
        // Found live (searchStores side): exactly that shape, with no
        // split at all — both searches ran for real, and extractOutcome's
        // own stores/furtherStores/externalStoreSuggestions merge (by
        // design, for the ordinary "same tool called twice for the
        // mandatory cascade" case) flattened both needs' results into ONE
        // undifferentiated bucket. The model's own reply text still
        // correctly described two separate outcomes side by side (a real
        // Velte match for one need, external suggestions for the other) —
        // but the result CARDS couldn't show which belonged to which, and
        // the second need's own findings didn't surface anywhere the buyer
        // could actually see them, even though the text said they would.
        // Added pre-emptively for searchProducts too, same gap, same fix.
        //
        // Same double-gate as the branch above (hasMultipleIntents AND
        // isGenuineDualIntent) — a plain "≥2 calls to the same tool" alone
        // isn't enough, since the model can genuinely call either tool
        // twice for the SAME need too (e.g. two slightly different
        // phrasings after a first attempt found nothing, or the mandatory
        // cascade's own retry shapes). Deduped by the call's own term
        // first — a literal repeat of the same call is never two distinct
        // needs, whatever isGenuineDualIntent's own token-overlap check
        // might say about a short/generic term compared against itself.
        if (
          !outcome.clarification &&
          !isAcknowledgementReply(message) &&
          hasMultipleIntents
        ) {
          const uniqueStoreCalls: typeof outcome.storeCalls = [];
          const seenBusinessTypes = new Set<string>();
          for (const call of outcome.storeCalls) {
            const businessType = (
              call.input as { businessType?: string } | undefined
            )?.businessType;
            if (businessType && !seenBusinessTypes.has(businessType)) {
              seenBusinessTypes.add(businessType);
              uniqueStoreCalls.push(call);
            }
          }

          if (uniqueStoreCalls.length >= 2) {
            const [callA, callB] = uniqueStoreCalls;
            const inputA = callA.input as {
              businessType: string;
              location?: string;
            };
            const inputB = callB.input as {
              businessType: string;
              location?: string;
            };

            if (isGenuineDualIntent(inputA.businessType, inputB.businessType)) {
              const labelA = inputA.businessType;
              const labelB = inputB.businessType;
              const itemA: BackgroundSearchItem = {
                type: "store",
                businessType: inputA.businessType,
                location: inputA.location || inputB.location || undefined,
              };
              const itemB: BackgroundSearchItem = {
                type: "store",
                businessType: inputB.businessType,
                location: inputB.location || inputA.location || undefined,
              };
              await emitDualIntentSplit(itemA, itemB, labelA, labelB);
              return;
            }
          }

          // Mirror of the searchStores case just above, for two PHYSICAL
          // products named in one message instead — see this whole
          // section's own top comment. Only reached when the searchStores
          // shape didn't already fire (a turn is realistically only ever
          // going to hit ONE of these two same-tool shapes, never both).
          const uniqueProductCalls: typeof outcome.productCalls = [];
          const seenProducts = new Set<string>();
          for (const call of outcome.productCalls) {
            const product = (call.input as { product?: string } | undefined)
              ?.product;
            if (product && !seenProducts.has(product)) {
              seenProducts.add(product);
              uniqueProductCalls.push(call);
            }
          }

          if (uniqueProductCalls.length >= 2) {
            const [callA, callB] = uniqueProductCalls;
            const inputA = callA.input as {
              product: string;
              attributes?: string[];
              location?: string;
            };
            const inputB = callB.input as {
              product: string;
              attributes?: string[];
              location?: string;
            };

            if (isGenuineDualIntent(inputA.product, inputB.product)) {
              const labelA = buildProductTerm(
                inputA.product,
                inputA.attributes,
              );
              const labelB = buildProductTerm(
                inputB.product,
                inputB.attributes,
              );
              const itemA: BackgroundSearchItem = {
                type: "product",
                product: inputA.product,
                attributes: inputA.attributes,
                location: inputA.location || inputB.location || undefined,
              };
              const itemB: BackgroundSearchItem = {
                type: "product",
                product: inputB.product,
                attributes: inputB.attributes,
                location: inputB.location || inputA.location || undefined,
              };
              await emitDualIntentSplit(itemA, itemB, labelA, labelB);
              return;
            }
          }
        }

        // Reaching here means this ISN'T a genuine dual-intent turn (either
        // the outer condition never held, or isGenuineDualIntent said no —
        // the ordinary mandatory single-item cascade also produces both
        // calls, see that function's own comment) — so nothing needs
        // discarding. Flush every buffered candidate pool now, in order,
        // exactly reproducing what plain live pushing would have produced
        // (see bufferingStatuses' own comment up top for why candidate
        // pools, not pre-picked text, are what's buffered).
        if (bufferingStatuses) {
          bufferingStatuses = false;
          for (const candidates of bufferedPushCandidates) push(candidates);
          bufferedPushCandidates.length = 0;
        }

        // Mandatory product→store cascade found category vendors but no
        // product LISTING (found live: sneaker photo → empty searchProducts
        // → searchStores returned vendors framed as "here's what matched
        // best"). Those vendors aren't a catalog match — they're businesses
        // that might carry / do the thing without having listed it. Convert
        // to the same Buyer Request offer the dead-end cross-check uses
        // (foundPossibleVendorPhrase + Yes/No), and hide the store cards —
        // but ONLY when create-style matching on the short query that found
        // them can still contact someone (found live: offering then
        // no_matching on Yes because create re-searched a long photo
        // description). Skipped when the buyer only asked for a kind of
        // business (storeCall alone) — that IS a store search and should
        // show cards.
        let replyOverride: string | null = null;
        // Set only when THIS file authored a "nothing anywhere" dead-end
        // line. The external connectors run much later (they're the last
        // thing tried), so the line is chosen before anyone knows whether
        // there are online offers to show — this remembers the term so it
        // can be re-phrased once that's known, rather than leaving "and
        // nothing close by either" sitting on top of six live listings. A
        // model-authored reply is never touched: it had the turn's real
        // context and this doesn't.
        let deadEndTerm: string | null = null;
        let buyerRequestMatchQuery: string | null = null;
        if (
          outcome.productCall &&
          outcome.products.length === 0 &&
          outcome.stores.length > 0 &&
          !outcome.clarification &&
          !isAcknowledgementReply(message)
        ) {
          const cascadeProductInput = outcome.productCall.input as {
            product?: string;
            attributes?: string[];
          };
          const cascadeTerm = cascadeProductInput.product
            ? buildProductTerm(
                cascadeProductInput.product,
                cascadeProductInput.attributes,
              )
            : "that";
          const storeBusinessType = (
            outcome.storeCall?.input as { businessType?: string } | undefined
          )?.businessType;
          const matchQuery = (storeBusinessType || cascadeTerm).trim();
          const canContact = matchQuery
            ? await hasContactableVendorsForQuery(
                matchQuery,
                body?.buyerLocation,
              )
            : false;
          // Always hide the cascade store cards — they aren't listings for
          // the buyer's item. Only offer reach-out when matching can deliver.
          outcome = {
            ...outcome,
            stores: [],
            furtherStores: [],
            storesQuery: null,
            storesMatchTier: null,
            storesMatchQuality: undefined,
            ...(canContact ? { buyerRequestOffered: true } : {}),
          };
          if (canContact) {
            buyerRequestMatchQuery = matchQuery;
            replyOverride = pickAvoiding(
              foundPossibleVendorPhrase(
                cascadeTerm,
                looksLikeServiceTask(cascadeTerm),
              ),
              [],
            );
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
                allowNearbyBusinesses,
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
            const businessType = buildProductTerm(
              productInput.product,
              productInput.attributes,
            );
            const fallback = await searchStoresCore(
              {
                businessType,
                location: productInput.location,
                radiusKm: productInput.radiusKm,
              },
              {
                buyerLocation: body?.buyerLocation,
                push,
                allowNearbyBusinesses,
              },
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
        // ONE reply bubble for this whole turn — whichever scan-outcome
        // phrase fires below (found a real match, found a possible vendor,
        // or noVendorEvenBySectorPhrase) is the buyer's only chat message.
        // Reverted (2026-08-20) from an earlier three-visible-stage design
        // (a `reply` event of its own closing the direct search, THEN a
        // second bubble reporting the scan) per explicit request: back to
        // back, those two bubbles read as the same statement twice —
        // "couldn't find X directly on Velte" immediately followed by "no
        // match on Velte for X, even a loose one" says the same thing in
        // two messages. The "not found directly" framing still narrates,
        // just as a STATUS line now (transient, never a persisted bubble)
        // right below, ahead of the scan actually running — see the
        // CROSS-CHECK comment below for what that scan does and why.
        if (
          !outcome.clarification &&
          !outcome.buyerRequestOffered &&
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
            ? buildProductTerm(
                deadEndProductInput.product,
                deadEndProductInput.attributes,
              )
            : null;
          const storeTerm = deadEndStoreInput?.businessType ?? null;
          const scanTerm = productTerm ?? storeTerm ?? "that";
          const scanLocation =
            deadEndProductInput?.location ?? deadEndStoreInput?.location;

          push(notFoundDirectlyPhrase(scanTerm));
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
                  {
                    buyerLocation: body?.buyerLocation,
                    push,
                    allowNearbyBusinesses,
                  },
                )
              : null;
          const productScan =
            storeTerm && bothToolsCalled
              ? await searchProductsCore(
                  { product: storeTerm, location: scanLocation },
                  {
                    buyerLocation: body?.buyerLocation,
                    push,
                    allowNearbyBusinesses,
                  },
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
          } else if (
            storeScanResult &&
            storeScanResult.results.length &&
            (await hasContactableVendorsForQuery(scanTerm, body?.buyerLocation))
          ) {
            outcome = { ...outcome, buyerRequestOffered: true };
            buyerRequestMatchQuery = scanTerm;
            replyOverride = pickAvoiding(
              foundPossibleVendorPhrase(
                scanTerm,
                looksLikeServiceTask(scanTerm),
              ),
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
              noVendorEvenBySectorPhrase(
                scanTerm,
                mergedExternal.length > 0,
                looksLikeServiceTask(scanTerm),
              ),
              [],
            );
            deadEndTerm = scanTerm;
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
          deadEndTerm = null;
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

        // Phase 4 (docs/velte-ai-search-flow-plan.md): external offers,
        // and ONLY on a genuine dead end. The gate is deliberately strict
        // — nothing on Velte at all, no clarification pending, and no
        // reach-out offer being made — because Velte's own vendors are the
        // business and an off-platform link is the consolation, never a
        // competitor sitting alongside a real match. Also skipped entirely
        // when no connector is configured, so an install without
        // SERPER_API_KEY spends nothing and behaves exactly as before.
        let externalOffers: ExternalOffer[] = [];
        const nothingOnVelte =
          !clarification &&
          products.length === 0 &&
          stores.length === 0 &&
          vendorProducts.length === 0 &&
          !buyerRequestOffered;
        if (nothingOnVelte && hasExternalConnectors()) {
          const productInput = productCall?.input as
            | { product?: string }
            | undefined;
          const storeInput = storeCall?.input as
            | { businessType?: string }
            | undefined;
          const externalQuery =
            productInput?.product ?? storeInput?.businessType ?? message;
          // The exact mirror of the Places rule, sharing its one helper:
          // Places answers SERVICE dead ends, online offers answer PRODUCT
          // ones, and neither answers the other. Without this, "I need a
          // plumber" came back with four bottles of Mr Plumber Drain
          // Unblocker — found while checking whether these fixes
          // generalize past the query that prompted them. A buyer who
          // needs a person cannot be sold a bottle.
          const isServiceRequest = allowsNearbyBusinesses(
            externalQuery ?? "",
            allowNearbyBusinesses,
          );
          if (externalQuery?.trim() && !isServiceRequest) {
            push(checkingElsewherePhrase(externalQuery));
            externalOffers = await fetchExternalOffers({
              query: externalQuery,
            });
            // The same kind-of-item gate searchProductsCore runs on Velte's
            // own results (verifyMatches.ts), applied to the fallback list.
            // Google Shopping answers "corporate shoe" with sneakers just
            // as readily as a vector index does — and a shop's SEO title is
            // weaker evidence than a vendor's own listing, so the photo is
            // doing most of the work here. Emptying the list is a
            // legitimate outcome: everything below already treats "no
            // offers" as the ordinary case, so all six being the wrong
            // product simply reads as the connector having found nothing.
            if (externalOffers.length) {
              push(checkingPhotosPhrase(externalQuery));
              const verified = await verifyOfferMatches({
                query: externalQuery,
                offers: externalOffers,
              });
              if (verified.rejected.length) {
                console.info(
                  `[search] dropped ${verified.rejected.length} wrong-kind external offer(s) for "${externalQuery}":`,
                  verified.rejected.map(
                    (r) => `${r.offer.title} → ${r.actualItem}`,
                  ),
                );
                externalOffers = verified.kept;
              }
            }
          }
        }

        // See deadEndTerm's own comment — the line that said "nothing
        // close by either" was written before the connectors ran, and is
        // now demonstrably wrong on screen.
        if (externalOffers.length > 0 && deadEndTerm) {
          replyOverride = pickAvoiding(
            noVendorButOnlineOffersPhrase(deadEndTerm),
            [],
          );
        }

        // Phase 3 (docs/velte-ai-search-flow-plan.md): the comparison /
        // recommendation call — one extra structured-output LLM round,
        // only when there are actually ≥2 product results to compare and
        // no clarification took over the turn. Narrated by its own status
        // line since the search itself is already done by now; on any
        // failure pickRecommendation returns null and the cards render
        // exactly as before.
        // Capture what the search actually ran with, for the goal sheet —
        // the model's own tool arguments, so the stored ceiling is exactly
        // the one the results were filtered by. `rememberedBudget` is the
        // fallback the tool applied when the model omitted a budget, which
        // keeps a carried-over ceiling alive across turns instead of
        // silently expiring the first time it isn't restated.
        {
          const input = productCall?.input as
            | { maxBudgetNaira?: number; attributes?: string[] }
            | undefined;
          goalUpdate = {
            maxBudgetNaira: input?.maxBudgetNaira ?? rememberedBudget,
            attributes: Array.isArray(input?.attributes)
              ? input.attributes
              : undefined,
          };
        }

        let recommendation: SearchRecommendation | null = null;
        // The distinct-terms guard: when the model called searchProducts
        // more than once for genuinely DIFFERENT items in one turn (a
        // multi-need message the dual-intent interception declined to
        // split), `products` is a merged pool of unrelated needs — a
        // "Top pick" crowned across a laptop and a caterer is nonsense, so
        // no recommendation at all is the honest outcome. Retries that
        // re-search the SAME item under slightly different phrasing still
        // pass (compared as normalized terms).
        const distinctProductTerms = new Set(
          outcome.productCalls
            .map((c) =>
              ((c.input as { product?: string } | undefined)?.product ?? "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean),
        );
        if (
          !clarification &&
          products.length >= 2 &&
          distinctProductTerms.size <= 1
        ) {
          push(comparingOptionsPhrase(products.length));
          const productInput = productCall?.input as
            | { product?: string }
            | undefined;
          recommendation = await pickRecommendation({
            query: message || productInput?.product || "the item in the photo",
            products,
          });
        } else if (!clarification && externalOffers.length >= 2) {
          // The dead-end turn's own comparison. Reported 2026-08-26: the
          // picks and badges only ever ran on Velte results, so the one
          // turn where the buyer knows least — six unfamiliar shops, no
          // vendor relationship, no distance — was the one turn that got
          // no help at all. Reachable only here, since externalOffers is
          // non-empty only when Velte itself found nothing (see the
          // nothingOnVelte gate above), so this can never crowd out a real
          // vendor's own picks.
          push(comparingOptionsPhrase(externalOffers.length));
          const productInput = productCall?.input as
            | { product?: string }
            | undefined;
          recommendation = await pickExternalRecommendation({
            query: message || productInput?.product || "the item in the photo",
            offers: externalOffers,
          });
        }

        // Which of this turn's picks Velte will offer to keep an eye on.
        // Computed from the recommendation just made, so the offer can never
        // name something the buyer wasn't shown — and empty whenever there is
        // no recommendation or nothing watchable in it.
        const watchOffer = watchCandidatesFor(
          recommendation,
          products,
          externalOffers,
        );

        await sendFinal({
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
          // Empty on this, the ordinary single-item path — only the
          // dual-intent branch further up this file (its own early
          // `return`) ever populates this.
          backgroundItems: [],
          dualIntentItemALabel: null,
          // Mirrors buyerRequestOffered — covers the rare case where the
          // model itself still calls offerBuyerRequestTool directly
          // (still a registered tool, even though systemPrompt.ts no
          // longer instructs the double-empty case to reach for it — see
          // that file's own comment) — same agreement short-circuit
          // applies regardless of which code path produced the offer.
          awaitingBuyerRequestReply: buyerRequestOffered,
          buyerRequestMatchQuery: buyerRequestOffered
            ? buyerRequestMatchQuery
            : null,
          recommendation,
          watchOffer,
          // A search turn is never itself a watch request — the classifier
          // short-circuits those long before any tool runs.
          watchRequest: null,
          externalOffers,
        });

        // Recruitment-lead capture: Velte had no vendor for this request AND
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
