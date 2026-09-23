import { stepCountIs, type ModelMessage, type UserContent } from "ai";
import * as chrono from "chrono-node";

import { buildProductTerm, cleanBusinessType } from "@/lib/productTerm";
import { parseOfferPrice } from "@/lib/priceText";
import { generateUUID } from "@/lib/uuid";
import { callLLM } from "@/lib/server/ai/router";
import { withTurnUsage, annotateTurn } from "@/lib/server/ai/usage";
import {
  affordCredits,
  chargeCredits,
  creditMessage,
} from "@/lib/server/creditLedger";
import { isBillableTurn } from "@/lib/turnBillable";
import type { CreditAction } from "@/lib/credits";
import { guestNetworkLimitedMessage } from "@/lib/credits";
import {
  checkGuestNetworkAllowance,
  guestIpFromRequest,
} from "@/lib/server/guestNetworkGate";
import { backendData } from "@/lib/server/backend";
import { aiSearchFetch } from "@/lib/server/aiSearchBackend";
import {
  searchProductsTool,
  searchProductsCore,
  usableAttributes,
  usableBudget,
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
import {
  buildVelteComparisonTemplate,
  buildExternalComparisonTemplate,
  buildStoreComparisonTemplate,
} from "@/lib/server/ai/comparisonTemplate";
import { getAttributeSchemaOverrides } from "@/lib/server/attributeSchemas";
import {
  fetchExternalOffers,
  hasExternalConnectors,
} from "@/lib/server/connectors";
import {
  isInstagramLeadSearchEnabled,
  searchInstagramBusinesses,
} from "@/lib/server/connectors/instagramBusinessSearch";
import {
  understandingRequestPhrase,
  pickAvoiding,
  checkingElsewherePhrase,
  checkingPhotosPhrase,
  comparingOptionsPhrase,
  notFoundDirectlyPhrase,
  scanningVendorsPhrase,
  foundPossibleVendorPhrase,
  similarMatchReachOutPhrase,
  externalOffersWithLocalOfferPhrase,
  noVendorEvenBySectorPhrase,
  noVendorButOnlineOffersPhrase,
  isAcknowledgementReply,
  isAskingForExplanation,
  isOfferDeclineReply,
  offerDeclinedPhrase,
  splittingRequestPhrase,
  itemPickQuestionPhrase,
  buildingShoppingPlanPhrase,
} from "@/lib/server/ai/statusPhrases";
import { buildShoppingPlanSnapshot } from "@/lib/server/ai/buildShoppingPlanSnapshot";
import {
  buildDeadlineAskGate,
  composeDeadlineAskReply,
} from "@/lib/server/ai/deadlineAskGate";
import { confirmBulkPurchase } from "@/lib/server/ai/confirmBulkPurchase";
import { answerBuyingQuestion } from "@/lib/server/ai/adviceAnswer";
import {
  buildBudgetAskGate,
  composeBudgetAskReply,
} from "@/lib/server/ai/budgetAskGate";
import {
  classifyShoppingPlanManagement,
  type ManageablePlanContext,
  type ManageShoppingPlanResult,
} from "@/lib/server/ai/manageShoppingPlanTool";
import {
  buildSystemPrompt,
  buildAgreementOnlySystemPrompt,
  buildDescriptionOnlySystemPrompt,
  buildScopeCheckSystemPrompt,
  buildComparisonAnswerSystemPrompt,
} from "@/lib/server/ai/systemPrompt";
import { comparisonPickTool } from "@/lib/server/ai/comparisonPickTool";
import { classifyScopeTool } from "@/lib/server/ai/classifyScopeTool";
import { verifyOfferMatches } from "@/lib/server/ai/verifyMatches";
import { verifyStoreMatches } from "@/lib/server/ai/verifyStoreMatches";
import { suggestBuyingGuidance } from "@/lib/server/ai/suggestBuyingGuidance";
import {
  buildBareQueryGate,
  composeBareQueryReply,
} from "@/lib/server/ai/bareQueryGate";
import { explainClarification } from "@/lib/server/ai/explainClarification";
import {
  checkToolAlignment,
  toolMismatchReply,
} from "@/lib/server/ai/toolAlignment";
import {
  getSectorClarifiers,
  looksLikeServiceTask,
  allowsNearbyBusinesses,
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
  AnyRecommendation,
  BackgroundSearchItem,
  BuyerLocation,
  BuyerRequestOffer,
  BuyerRequestToolOutcome,
  Clarification,
  ComposerTool,
  ExternalOffer,
  InstagramLead,
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchHistoryTurn,
  RequestRelation,
  SearchIntentKind,
  SearchRequestBody,
  SearchStreamEvent,
  ShoppingPlanSnapshot,
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

// The server-side history wins whenever it's at least as complete as what
// the client resent (the client's copy still covers the gap where an earlier
// turn's persist write failed, or hasn't landed yet). But the structural
// flags on assistant turns (awaitingVendorSearchOffer, isGuidanceReply,
// comparisonOptions, ...) are what this route ROUTES on, and the server copy
// is rebuilt from staffly-ai-backend's own typed projection — which has now
// lagged a newly added flag FOUR separate times (its SearchConversation
// model's own comment lists the first three; 2026-09-16, "Yes, look for a
// vendor" was the fourth: awaitingVendorSearchOffer lived only on the client
// for a day, so on every persisted conversation the agreement fell through
// to the ordinary product pipeline, dead-ended, and RE-OFFERED the same
// vendor search in a loop). The backend is fixed each time, but this is the
// belt to that suspender: overlay the client's defined flags onto the
// aligned server turn wherever the server copy has NO value at all for that
// key, so a projection that lags the frontend by a deploy can't silently
// drop a flag the route depends on. Aligned from the END (both lists are
// most-recent-last, and the server's may run further back), and only where
// role AND content agree, so a misalignment can never attach one turn's
// flags to another — the first disagreement stops the overlay outright.
// Never overrides a value the server actually returned: once the backend
// knows a field, the persisted copy is the truth.
function mergeHistories(
  server: SearchHistoryTurn[],
  client: SearchHistoryTurn[],
): SearchHistoryTurn[] {
  if (server.length < client.length) return client;
  if (!client.length) return server;
  const merged = server.slice();
  for (let k = 0; k < client.length; k += 1) {
    const si = server.length - 1 - k;
    const ci = client.length - 1 - k;
    const s = server[si];
    const c = client[ci];
    if (s.role !== c.role || s.content !== c.content) break;
    const overlay: Partial<SearchHistoryTurn> = {};
    for (const key of Object.keys(c) as (keyof SearchHistoryTurn)[]) {
      if (c[key] !== undefined && s[key] === undefined) {
        (overlay as Record<string, unknown>)[key] = c[key];
      }
    }
    merged[si] = { ...s, ...overlay };
  }
  return merged;
}

// Generic "wall of text / rigid table" detector for a comparison-answer
// reply (2026-09-15, found live — see this file's own call site for the
// exact failure: a "pick the best for me" reply came back as a full
// Strengths/Downsides breakdown of BOTH options plus a conditional dual
// recommendation, instead of a few sentences naming ONE pick, and the buyer
// never got an actual answer to what they asked). Deliberately generic — no
// category name, brand, or product type anywhere in it — so it catches the
// same violation shape regardless of what's being compared. A false
// positive only costs a plainer (but still correct) fallback line, never a
// wrong answer, so this stays intentionally loose rather than trying to be
// a precise grammar check.
const STRUCTURED_BREAKDOWN_MARKERS =
  /\b(strengths?|downsides?|pros?|cons?)\s*:/i;
const MARKDOWN_HEADING_LINE = /^#{1,6}\s/m;
const BULLET_LINE = /^\s*[-*•]\s+/gm;
// Raised from 600 (2026-09-21, found live: buildComparisonAnswerSystemPrompt
// was reworded the same day — see its own header — to explicitly REQUIRE "a
// genuine short paragraph, several sentences of real substance, that
// actually walks through 2–4 concrete points of difference" instead of "a
// few natural sentences", because a bare one-line verdict with no reasoning
// was itself the violation being caught live at the time. Nobody updated
// THIS number to match: a model correctly complying with the new, longer
// requirement routinely runs past 600 characters, so this backstop was
// silently discarding a good, compliant, substantive answer and replacing
// it with the exact bare-verdict template the prompt rewrite existed to
// stop — the buyer saw the short fallback line on nearly every comparison,
// looking exactly like the model had ignored the elaboration rule when it
// may well have complied and been overruled here instead. 1600 gives a
// real 2-4-point paragraph room to breathe; the OTHER three checks below
// (headings, "Strengths:"/"Downsides:" markers, 2+ bullet lines) are what
// actually detect a rigid table/breakdown — length alone was never a
// precise signal for that shape, only a rough proxy that stopped being
// valid the moment the target length changed.
// Raised again to 3000 (2026-09-23, measured, not guessed): four live
// comparisons — Camry vs Accord, Camon 30 vs A15, two runs each — were all
// good, compliant 4–5 point answers at 1,834–2,028 characters, and every one
// was discarded here for the bare "Between these, I'd go with X" line. The
// prompt now asks for ~700–1,100 characters itself; this is only the
// runaway-answer backstop, not the target.
const MAX_COMPARISON_ANSWER_LENGTH = 3000;
// Raised from 2 (2026-09-21, same pass as MAX_COMPARISON_ANSWER_LENGTH above,
// same root cause) — buildComparisonAnswerSystemPrompt now explicitly
// invites "a short list... when the comparison genuinely breaks down into a
// small set of discrete factors", reversing the old "never bullet lists"
// rule this threshold was tuned against. 2 bullets was never a list, it was
// a trip-wire: it fired on the exact kind of short, legitimate highlight
// list (camera / battery / price, say) the prompt now asks for, discarding
// a good compliant answer the same way the old length check did. What
// actually distinguishes a genuine "rigid per-option breakdown" (the live
// incident this whole detector exists for) is a bullet count roughly
// doubled by covering BOTH options' strengths AND downsides separately —
// typically 6+ in practice — not merely "more than one point worth
// listing".
const MAX_COMPARISON_ANSWER_BULLETS = 8;
function looksLikeStructuredBreakdown(text: string): boolean {
  if (text.length > MAX_COMPARISON_ANSWER_LENGTH) return true;
  if (MARKDOWN_HEADING_LINE.test(text)) return true;
  if (STRUCTURED_BREAKDOWN_MARKERS.test(text)) return true;
  const bulletLines = text.match(BULLET_LINE)?.length ?? 0;
  return bulletLines > MAX_COMPARISON_ANSWER_BULLETS;
}

/**
 * THE one gate that may ever turn a Velte product dead end into a
 * Buyer-Request reach-out offer (2026-09-15 — the canonical flow: Velte
 * product first; if nothing, check whether a REAL Velte vendor exists for
 * the product's category; if yes, that vendor gets contacted via Buyer
 * Request; if no, fall through to the external/Serper search). Every call
 * site that used to hand-roll "search stores, verify the kind, check
 * contactable" now goes through here — before this, three separate copies
 * of this exact three-step check existed (the product→store cascade, the
 * asymmetric product→store fallback, and the dead-end cross-check), and
 * every real live bug caught today (agbada beads, "car battery" matching an
 * electronics shop, a laptop matching an IT-repair store) was some copy of
 * this check missing its verify step. One implementation is the only way
 * "verify before offering" can't be forgotten again on a future branch.
 *
 * `stores` is the raw hit list already in hand (a cascade already has one
 * from the model's own searchStores call) — this never re-searches, it only
 * verifies and checks contactability, so callers that need the search
 * itself still run searchStoresCore first.
 */
async function findReachOutEligibleVendors(
  // Verified against the ITEM the buyer actually named — that's what the
  // offer promises a vendor "might carry", never a model paraphrase. Kept
  // as its own param, separate from `contactTerm` below: a caller with a
  // store-level businessType paraphrase (from its own searchStores call)
  // passes that as `contactTerm` instead, since it's what actually found
  // these stores in the first place and is more likely to hit on the
  // independent contactability search too — collapsing the two into one
  // term would lose that distinction some callers deliberately rely on.
  verifyTerm: string,
  stores: StoreMatch[],
  buyerLocation?: BuyerLocation,
  contactTerm: string = verifyTerm,
): Promise<{ eligible: boolean; kept: StoreMatch[] }> {
  if (!verifyTerm.trim() || !stores.length) {
    return { eligible: false, kept: [] };
  }
  const verification = await verifyStoreMatches({
    businessType: verifyTerm,
    stores,
  });
  if (verification.rejected.length) {
    console.info(
      `[search] dropped ${verification.rejected.length} wrong-kind vendor(s) for "${verifyTerm}":`,
      verification.rejected.map((r) => `${r.match.name} → ${r.actualBusiness}`),
    );
  }
  const eligible =
    verification.kept.length && contactTerm.trim()
      ? await hasContactableVendorsForQuery(contactTerm, buyerLocation)
      : false;
  return { eligible, kept: verification.kept };
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
          // to attribute this store to (see StoreMatch's own comment), and
          // so nothing to tag attributes/budget/sector against either.
          matchedQuery: null,
          matchedAttributes: [],
          matchedBudgetNaira: null,
          matchedSector: null,
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

// An initialism and its own expansion share ZERO literal tokens by design
// ("MC" / "Master of Ceremonies", "DJ" / "Disc Jockey") — the overlap-ratio
// check below can never catch this, the same blind spot its own comment
// already documents for "Infinix Hot 50i" vs. "phone repair shop" (a
// specific term vs. a generic one for the SAME thing). Found live
// (2026-09-16): "I also need an MC for my birthday party" got the model to
// call searchProducts("Master of Ceremonies") AND searchStores("MC") for
// the one thing the buyer actually asked for, and this function waved it
// through as genuinely different since "master"/"ceremonies" and "mc" have
// no token in common — the buyer then saw "you mentioned two things —
// which first?" for a single request. Checked in BOTH directions since
// callers don't guarantee which side is the abbreviation.
function isAcronymMatch(shortTerm: string, longTerm: string): boolean {
  const shortTokens = tokenize(shortTerm);
  if (shortTokens.length !== 1) return false;
  const short = shortTokens[0];
  if (short.length < 2 || short.length > 5) return false;
  const longWords = longTerm
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  if (longWords.length < 2) return false;
  return longWords.map((w) => w[0]).join("") === short;
}

function isGenuineDualIntent(productTerm: string, storeTerm: string): boolean {
  const productTokens = new Set(tokenize(productTerm));
  const storeTokens = new Set(tokenize(storeTerm));
  if (!productTokens.size || !storeTokens.size) return false;

  for (const verb of SAME_NEED_VERBS) {
    const stemmed = stem(verb);
    if (productTokens.has(stemmed) && storeTokens.has(stemmed)) return false;
  }

  if (
    isAcronymMatch(productTerm, storeTerm) ||
    isAcronymMatch(storeTerm, productTerm)
  ) {
    return false;
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
// The raw pattern alone matches "I also need an MC for my birthday party"
// just as readily as "fix my laptop, and I also need a plumber" — but only
// the second one actually names two things IN THIS MESSAGE. The first is a
// single, ordinary need that merely says "also" because it follows an
// EARLIER, separate request elsewhere in the conversation — nothing before
// "also need" names a first item at all. Found live (2026-09-16): that
// exact opener forced the dual-need retry below, which then told the model
// it "MUST call BOTH tools" — and the model complied by paraphrasing the
// SAME single need into two different-looking search terms ("Master of
// Ceremonies MC birthday party" and "MC") just to satisfy the instruction,
// producing a nonsensical "you mentioned two things — which first?" for
// what was always one request.
//
// Cheap fix to match the cheap heuristic it guards: require a minimum
// number of words BEFORE the matched connector — "fix my laptop, and I
// also need a plumber" has three real words ("fix my laptop") ahead of
// "and I also need"; "I also need an MC" has only the pronoun "I". Not
// exhaustive (a long single-item sentence that happens to end in "as
// well" can still slip through), but it directly closes the leading-opener
// case this was found on without narrowing the genuine "X, and also Y"
// case the mechanism exists for.
const DUAL_INTENT_MIN_PRECEDING_WORDS = 2;
function hasGenuineDualIntentPhrasing(text: string): boolean {
  const match = DUAL_INTENT_TEXT_PATTERN.exec(text);
  if (!match) return false;
  const precedingWords = text
    .slice(0, match.index)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return precedingWords.length >= DUAL_INTENT_MIN_PRECEDING_WORDS;
}
// Caption that only points at an attached photo — always one need, never two
// (see classifyScopeTool.ts). Used server-side so a flaky hasMultipleIntents
// from the pre-flight classifier can't still invent a dual-intent split.
const PHOTO_REFERRING_CAPTION =
  /^(?:where can i (?:find|get) this|how much(?: is this)?|what(?:'s| is) this|find(?: me)? this|get(?: me)? this|this(?: one)?)\b/i;
// Both canned stand-ins the app sends on the buyer's behalf when they answer
// the location ask — the share (handleLocationShared) AND the decline
// (ClarificationPrompt's own onDecline). Neither carries any of the request
// in it, so both must be skipped when looking back for what the buyer
// actually asked for.
//
// The decline was missing here until 2026-09-05, which meant
// lastSubstantiveUserMessage would happily return "Search without sharing my
// location" as though it were a real need.
function isSharedLocationMessage(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed === "Shared my location" ||
    trimmed === "Search without sharing my location"
  );
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
/** How many options one comparison may weigh.
 *
 *  Four. Each option is its own product search and its own external lookup,
 *  so this is a direct multiplier on what a compare turn costs and how long
 *  it takes — and a buyer weighing five things is not really comparing, they
 *  are browsing. Anything past this is dropped rather than refused: comparing
 *  the first four is a useful answer, and an error is not. */
const MAX_COMPARISON_OPTIONS = 4;

/** Shopping Plan (2026-09-18, lowered from 7 to 2 on 2026-09-19 per explicit
 *  product direction) — the deadline threshold that turns a request into a
 *  persistent, background-monitored plan instead of an immediate search.
 *  Deliberately just the day count, no item-count qualifier — see the
 *  scoping plan's own note on why a single item this far out is still a
 *  valid plan (it's what a separate Price Watch feature used to cover). */
const SHOPPING_PLAN_MIN_DAYS = 2;

/** Resolves a buyer's own deadline phrasing ("in 3 weeks", "by Monday",
 *  "September 25") to a concrete local date, deterministically — CODE, via
 *  chrono-node against this server's own clock, never the model (2026-09-19,
 *  replacing classifyScopeTool's own deadlineDate field after it twice
 *  resolved a plainly future phrase to a date in 2023 — see that field's
 *  removal comment). `forwardDate: true` is what makes a bare weekday name
 *  resolve to the NEXT one rather than the most recent past one. Read off
 *  the parsed Date's own LOCAL calendar fields, not `.toISOString()`,
 *  which normalizes to UTC and can roll the day itself backward or forward
 *  depending on the server's timezone offset — chrono's reference point was
 *  local `new Date()`, so the answer has to stay in that same frame. null
 *  when nothing resolves, which route.ts treats the same as no deadline at
 *  all. */
function resolveDeadlineDate(text: string): string | null {
  const parsed = chrono.parseDate(text, new Date(), { forwardDate: true });
  if (!parsed) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Shopping Plan (2026-09-19) — the buyer's own stated budget figure, read
// deterministically off their own text, CODE never the model: same "the
// model translates, the data decides" rule resolveDeadlineDate already
// follows for dates, and the reason buildShoppingPlanSnapshot.ts no longer
// asks the model to invent a naira figure of any kind (see that file's own
// header). Deliberately conservative — a bare number with no currency
// marker or magnitude word ("3", "2026") is never read as money, since
// that's exactly the kind of confident-but-wrong guess this codebase avoids
// (parseOfferPrice takes the same stance on a listing's own price string).
const BUDGET_NUMBER = "[\\d,]+(?:\\.\\d+)?";
const BUDGET_UNIT_MULTIPLIER: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mil: 1_000_000,
  million: 1_000_000,
};

function resolveBudgetNaira(text: string): number | null {
  const t = text.trim();
  if (!t) return null;

  // ₦250,000 / N250,000 / ₦2.5m / ₦300k — currency-marked, unit optional.
  let m = t.match(
    new RegExp(
      `(?:₦|\\bN(?=\\d))\\s*(${BUDGET_NUMBER})\\s*(k|m|mil|thousand|million)?`,
      "i",
    ),
  );
  // "250k naira" / "2.5 million naira" / "500000 naira" — unit optional.
  if (!m)
    m = t.match(
      new RegExp(
        `(${BUDGET_NUMBER})\\s*(k|m|mil|thousand|million)?\\s*naira`,
        "i",
      ),
    );
  // Bare "250k" / "2.5m" / "300 thousand" — no currency marker, but a
  // magnitude word is what makes this read as money rather than a bare
  // count (a quantity, a date, a phone digit run).
  if (!m)
    m = t.match(
      new RegExp(`\\b(${BUDGET_NUMBER})\\s*(k|m|mil|thousand|million)\\b`, "i"),
    );
  if (!m) return null;

  const value = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = m[2]?.toLowerCase();
  const multiplier = unit ? (BUDGET_UNIT_MULTIPLIER[unit] ?? 1) : 1;
  const naira = Math.round(value * multiplier);
  return naira > 0 ? naira : null;
}

// The lenient sibling above's strictness is right for reading a budget out
// of ORDINARY prose (where a bare number is genuinely ambiguous — a
// quantity, a year, a phone digit run). It's wrong for a reply that's
// DIRECTLY answering "what's your budget?" (isAnsweringShoppingPlanBudgetAsk
// below) — there the question itself already disambiguates a bare number
// ("around 2000000", no ₦/naira/k/m marker at all — found live, this
// exact reply silently failed to parse and dropped the buyer out of the
// whole Shopping Plan flow rather than re-asking). Only reached when the
// strict parse above has already failed. A floor (100) rules out a
// one/two-digit reply that's clearly not a real naira figure ("just 2").
const LENIENT_BUDGET_MIN_NAIRA = 100;
function resolveBudgetNairaLenient(text: string): number | null {
  const strict = resolveBudgetNaira(text);
  if (strict != null) return strict;
  const m = text.match(new RegExp(`\\b(${BUDGET_NUMBER})\\b`));
  if (!m) return null;
  const value = Math.round(Number(m[1].replace(/,/g, "")));
  return Number.isFinite(value) && value >= LENIENT_BUDGET_MIN_NAIRA
    ? value
    : null;
}

function formatNairaForReply(naira: number): string {
  return `₦${Math.round(naira).toLocaleString("en-NG")}`;
}

function formatDeadlineForReply(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Whole days between now and an ISO (YYYY-MM-DD) date, floored — pure
 *  arithmetic on a date resolveDeadlineDate has already produced; never a
 *  parser of its own. Returns null for anything that doesn't parse to a
 *  real date. */
function daysUntilIsoDate(iso: string): number | null {
  const target = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const diffMs = target.getTime() - todayUtc;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Writes one conversational management action (Phase 3, spec §23) onto the
 * real backend record — the model TRANSLATED the buyer's words into this
 * result; this is the one place that actually MUTATES the plan, never just
 * a conversational reply (spec §23's own explicit requirement). Returns
 * false on any failure — the caller falls back to a plain "something went
 * wrong" reply rather than confirming a change that didn't actually land.
 */
async function applyShoppingPlanManagement(
  managed: ManageShoppingPlanResult,
  cookie: string | null,
): Promise<boolean> {
  if (!managed.planId) return false;
  const path = `/shopping-plans/${encodeURIComponent(managed.planId)}`;
  const opts = { cookie: cookie ?? undefined };
  try {
    switch (managed.action) {
      case "update_budget":
        if (managed.budgetNaira == null || managed.budgetNaira <= 0)
          return false;
        await backendData(path, {
          ...opts,
          method: "PATCH",
          body: { budgetNaira: Math.round(managed.budgetNaira) },
        });
        return true;
      case "update_deadline":
        if (!managed.deadlineDate) return false;
        await backendData(path, {
          ...opts,
          method: "PATCH",
          body: { deadlineDate: managed.deadlineDate },
        });
        return true;
      case "pause":
        await backendData(path, {
          ...opts,
          method: "PATCH",
          body: { status: "paused" },
        });
        return true;
      case "resume":
        await backendData(path, {
          ...opts,
          method: "PATCH",
          body: { status: "monitoring" },
        });
        return true;
      case "cancel":
        await backendData(path, {
          ...opts,
          method: "PATCH",
          body: { status: "cancelled" },
        });
        return true;
      case "remove_item":
        if (!managed.itemId) return false;
        await backendData(
          `${path}/items/${encodeURIComponent(managed.itemId)}`,
          {
            ...opts,
            method: "PATCH",
            body: { removed: true },
          },
        );
        return true;
      case "set_priority":
        // Boosted well above the generation-order default (items.length -
        // index, always small) rather than incrementally nudged — "focus
        // on X first" means first, unambiguously, not "a bit sooner".
        if (!managed.itemId) return false;
        await backendData(
          `${path}/items/${encodeURIComponent(managed.itemId)}`,
          {
            ...opts,
            method: "PATCH",
            body: { priority: 1000 },
          },
        );
        return true;
      case "add_item":
        if (!managed.newItemLabel) return false;
        await backendData(`${path}/items`, {
          ...opts,
          method: "POST",
          body: { label: managed.newItemLabel },
        });
        return true;
      case "expedite":
        // No inline search here — see manageShoppingPlanTool.ts's own
        // header on why this stays a schedule nudge (brings the plan's
        // next monitoring tick forward, optionally boosting one item's
        // priority) rather than a synchronous search inside this turn.
        if (managed.itemId) {
          await backendData(
            `${path}/items/${encodeURIComponent(managed.itemId)}`,
            {
              ...opts,
              method: "PATCH",
              body: { priority: 1000 },
            },
          );
        }
        await backendData(path, {
          ...opts,
          method: "PATCH",
          body: { expedite: true },
        });
        return true;
      default:
        return false;
    }
  } catch (err) {
    console.error(
      `[shopping-plan] management action "${managed.action}" on ${managed.planId} failed:`,
      err,
    );
    return false;
  }
}

/** Loose match between a named comparison option and a search that ran.
 *
 *  Deliberately generous. The option comes from the scope classifier
 *  ("Toyota 2026 model") and the search term from the main call's own tool
 *  arguments ("Toyota 2026 model car") — the same thing in slightly different
 *  words, and demanding an exact match would re-run searches that already
 *  happened. Erring toward "already searched" is the cheap direction: the
 *  cost is a thinner comparison, where erring the other way is a duplicate
 *  vector search on every compare turn. */
function optionWasSearched(option: string, searchedTerms: string[]): boolean {
  const norm = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const optionTokens = norm(option).filter((t) => t.length > 2);
  if (!optionTokens.length) return true;
  return searchedTerms.some((term) => {
    const termTokens = new Set(norm(term));
    const hits = optionTokens.filter((t) => termTokens.has(t)).length;
    // Most of the option's distinctive words show up in the search that ran.
    return hits / optionTokens.length >= 0.6;
  });
}

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
  // Cleaned in place, here, once — every read of `storeCall.input
  // .businessType` anywhere below (the dead-end term, the dual-intent
  // check, every phrase function's own `what`) is a raw, unmodified read
  // of whatever the model wrote, and searchStoresCore's own cleaning (see
  // its own comment) only ever covers the search it actually runs, not
  // this object. Found live: "DJ services one day" reached a buyer-facing
  // dead-end sentence verbatim ("No one on Velte sells DJ services one
  // day") because nothing between the model and that text ever stripped
  // it. `input` is a plain object off the SDK's own tool-call result, safe
  // to mutate — this file already reads it as `unknown` and casts at every
  // call site, so there is no single funnel to fix this in short of
  // touching every one of those casts individually.
  if (storeCall?.input && typeof storeCall.input === "object") {
    const input = storeCall.input as { businessType?: string };
    if (typeof input.businessType === "string") {
      input.businessType = cleanBusinessType(input.businessType);
    }
  }

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
  // Overwritten further down route.ts, deterministically (not from a tool
  // call — see that code's own comment for why this offer has to be
  // code-authored rather than left to the model's own judgment): true once
  // this turn's reply asks whether the buyer would rather have a vendor
  // make/provide the item instead of buying one of the products just shown.
  const vendorSearchOffered = false;
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
    // Populated only by the dead-end cross-check further down route.ts
    // (see its own comment) — this function runs before that scan, so it
    // never has anything to report itself; declared here purely so
    // `outcome`'s type already carries the field before that later
    // `outcome = { ...outcome, instagramLeads: ... }` assignment.
    instagramLeads: [] as InstagramLead[],
    vendorProducts,
    vendorProductsStore,
    buyerRequestOffer,
    buyerRequestOffered,
    vendorSearchOffered,
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
  // already signed in.
  //
  // VENDOR wins when both cookies exist (2026-09-22, reversed — see
  // resolveActor.js's identical fix in velte-backend, same day, same root
  // cause: a vendor signed into /chat with Google using their own vendor
  // email kept being metered as the separate buyer account Google sign-in
  // creates, never recognised as themselves). Safe to prefer unconditionally
  // whenever BOTH cookies are simultaneously valid, without a separate link
  // check here: firebaseSignIn/loginAsVendor (identityLink.service.js) both
  // enforce cookie pairing/clearing at sign-in time — a mismatched vendor
  // cookie from an unrelated account gets CLEARED the moment a buyer signs
  // in under a different email, and vice versa — so two independently valid
  // cookies in the same browser are guaranteed to already be the same
  // linked person by the time this ever runs, never a coincidence.
  const vendorAuth = await getOptionalVendorAuth();
  const actorType: "guest" | "buyer" | "vendor" = vendorAuth
    ? "vendor"
    : buyerAuth
      ? "buyer"
      : "guest";
  const actorCookie = vendorAuth?.cookie ?? buyerAuth?.cookie ?? null;
  // The turn's action, and therefore its price: a photo turn costs a
  // multiple of a text turn because it genuinely costs that much more to
  // serve (see CREDIT_COST for the current numbers — deliberately not
  // repeated here, so this comment can't go stale again the next time they
  // change).
  //
  // CHECKED here, CHARGED on success (see sendFinal). Nothing is taken up
  // front: a buyer should never pay for a turn that failed, or for one
  // answered from the nearby-business path, which never reaches Serper and so
  // costs nothing to have run. The check still happens first, because
  // otherwise an empty balance could trigger a real model call and simply not
  // pay for it.
  // `let`, not `const`: reassigned below, right before the Shopping Plan
  // branch's own sendFinal call, for a turn that only turns out to be one
  // AFTER classification runs (the auto-detected-deadline path) — sendFinal
  // reads this same binding at charge time, so a later reassignment here is
  // exactly what makes that turn bill correctly despite being priced before
  // it was known. Known early only when the buyer explicitly picked the
  // Shopping Plan tool from the composer, which is checked directly off the
  // raw request body (no async session lookup needed for that one case).
  let turnAction: CreditAction =
    body?.activeTool === "shopping_plan"
      ? "shopping_plan"
      : imageUrl
        ? "photo"
        : "text";
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

  // The GUEST network backstop (2026-09-05, see lib/server/guestNetworkGate.ts).
  //
  // Only for a guest whose OWN browser-reported balance just passed above —
  // someone genuinely out of their own five credits gets the ordinary
  // "exhausted" message, not this one; conflating the two would blame the
  // network for something that is honestly just their own usage. This only
  // ever engages for a guest who reset their own count and is trying again,
  // which is exactly the gap a browser-only allowance cannot close on its
  // own (see that file's own header for why).
  //
  // Placed here, same rule the credit gate above already follows: before any
  // conversation load, retrieval or LLM call, so a refused turn never spends
  // anything.
  if (actorType === "guest") {
    const guestIp = guestIpFromRequest(req);
    const networkAllowed = await checkGuestNetworkAllowance(guestIp);
    if (!networkAllowed) {
      return new Response(
        JSON.stringify({
          type: "quota",
          message: guestNetworkLimitedMessage(),
          kind: turnAction === "photo" ? "photo" : "text",
          used: usage.balance,
          limit: usage.cost,
          planId: "guest",
          planName: "Velte credits",
          isGuest: true,
          actorType,
          reason: "network_limited",
        } satisfies SearchStreamEvent) + "\n",
        { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
      );
    }
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
  // WIDENED to `vendorAuth` too (2026-09-17) — a vendor signed into the
  // dashboard and browsing /chat is exactly as "signed in" as a buyer, just
  // on a different cookie (see ConversationSidebar's own `identity` note),
  // and the 2026-08-27 rule was about anonymity, not about which of the
  // two account kinds is present. A vendor with no linked buyer account was
  // otherwise permanently stuck on the pre-persistence, gone-on-refresh
  // behaviour, with no conversation ever saved or listed for them.
  //
  // Treating deviceId as null when there's no session is what switches it
  // off: every call below is already guarded on deviceId, so one condition
  // turns off ensure, append and rehydrate together rather than three
  // separate gates that could drift apart.
  const deviceId =
    (buyerAuth || vendorAuth) &&
    typeof body?.deviceId === "string" &&
    body.deviceId.trim()
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
        vendorId: vendorAuth?.userId ?? null,
        buyerLocation: locationUpdate,
      });
    } catch (err) {
      console.error(
        "[search] conversation ensure failed, going stateless:",
        err,
      );
    }
  }
  // Hoisted here (used to be declared much further down, right next to
  // `sheetApplies`) — 2026-09-10, so `sendFinal` (defined below) can safely
  // read `storedGoal?.maxBudgetNaira` for `knownBudgetNaira` on EVERY final
  // event, including the several early-exit sendFinal calls that run before
  // the line this used to live on. Referencing a `const` declared later
  // than an early-exit call site is exactly the temporal-dead-zone bug
  // `startsFreshRequest` already got bitten by once this same session (see
  // that declaration's own comment) — trivially safe to hoist since this is
  // pure derivation from `conversation`, already available here with no
  // dependency on anything computed later.
  const storedGoal = conversation?.task ?? null;
  // The server-side history wins whenever it's at least as complete as what
  // the client resent — the client's copy still covers the gap where an
  // earlier turn's persist write failed (or hasn't landed yet, for a
  // client-persisted background turn racing this call).
  const clientHistory = body?.history ?? [];
  const serverHistory = conversation?.history ?? [];
  const history = mergeHistories(serverHistory, clientHistory);

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

  // Declared here (`let`, reassigned below once the classifier's read is
  // available) rather than as a `const` at its original spot further down —
  // 2026-09-09, found live: sendFinal's own `goal` object reads this
  // binding, and sendFinal is called by every early-exit short-circuit
  // (tool-mismatch decline, and the fresh-comparison branch — see
  // isFreshComparisonRequest below), every one of
  // which runs BEFORE the boundary-decision block that used to declare this
  // as a `const`. A `const` is in the temporal dead zone until its own
  // declaration line executes, so any of those early sendFinal calls threw
  // ReferenceError: Cannot access 'startsFreshRequest' before initialization
  // — caught and only console.error'd by sendFinal's own try/catch, so the
  // turn displayed fine live and simply never made it to the database. This
  // is what a buyer saw as "the reply vanished after refresh." `false` is
  // the safe default for every turn that exits before the real classifier
  // decision runs: none of them are the boundary-decision turn, so leaving
  // the goal sheet exactly as it was (never wiping it) is correct.
  let startsFreshRequest = false;

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
      // Declared HERE, beside goalUpdate, for exactly the same reason — and
      // because it was caught red-handed not being (2026-09-10). sendFinal's
      // own `goal` object reads `itemTerm`, and this used to be a `let`
      // declared down with the rest of the scope-check results, several
      // hundred lines BELOW both sendFinal's definition and the early-exit
      // branches that call it (the tool-mismatch decline, the
      // fresh-comparison answer). Every one of
      // those threw `ReferenceError: Cannot access 'itemTerm' before
      // initialization` from inside sendFinal's try/catch, which logged and
      // swallowed it — so the turn streamed to the buyer perfectly and was
      // then never persisted at all. This is the SECOND variable in this one
      // object literal to do that (see startsFreshRequest's own comment);
      // anything sendFinal closes over has to be initialised above it, full
      // stop.
      let itemTerm: string | null = null;
      // The session's active tool as it should stand AFTER this turn — read
      // by sendFinal, so (like everything else it closes over) it is declared
      // here, above sendFinal, and merely ASSIGNED later once the tool is
      // known. Starts null so an early exit that never reaches the
      // assignment simply persists "no tool", which is the safe direction.
      let sessionToolAtTurnEnd: string | null = null;

      async function sendFinal(
        event: Omit<
          Extract<SearchStreamEvent, { type: "final" }>,
          "conversationId" | "knownBudgetNaira" | "activeTool" | "actorType"
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
        // exit path funnels through here. Guarded so the several early-exit
        // callers can't bill one turn twice.
        // The rule itself lives in lib/turnBillable.ts, shared with the
        // GUEST charge in searchStream.ts — those were two hand-written
        // copies of the same condition, and the clarification exemption was
        // added to this one alone, which left guests still paying for being
        // asked a question. One implementation, imported by both.
        if (!turnCharged && isBillableTurn(event)) {
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
          conversationId: conversation?.conversationId ?? null,
          // Injected here rather than by every call site (like
          // conversationId above) — 2026-09-10, found live: the buyer-
          // request identity flow's own "budget" step asked again for a
          // figure already given earlier in the SAME conversation, because
          // nothing carried the goal sheet's own known budget from the
          // offer turn through to that client-side flow. This is what lets
          // it skip the redundant ask — see IdentityCapture's own comment
          // in SearchHome.tsx.
          knownBudgetNaira: storedGoal?.maxBudgetNaira ?? null,
          // Injected here for the same reason, not per call site (2026-09-14)
          // — whatever this turn leaves sessionToolAtTurnEnd holding IS the
          // session's tool going forward, by the time sendFinal actually
          // runs (every earlier assignment/reset has already happened), so
          // reading it here can never disagree with what gets persisted a
          // few lines below via appendSearchTurn's own `activeTool`. See
          // SearchStreamEvent's own comment on this field for what the
          // client does with it.
          activeTool: (sessionToolAtTurnEnd as ComposerTool | null) ?? null,
          // Who this turn was actually resolved as, at the top of the
          // handler — see SearchStreamEvent's own comment on this field for
          // why the client needs it.
          actorType,
        };
        controller.enqueue(encodeEvent(full));
        if (conversation && deviceId) {
          try {
            await appendSearchTurn({
              conversationId: conversation.conversationId,
              deviceId,
              buyerId: buyerAuth?.buyerId ?? null,
              vendorId: vendorAuth?.userId ?? null,
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
              // The session's tool, carried to the next turn — see its own
              // comment where it's adopted. Always an explicit value (string
              // or null), never undefined, so this route is unambiguously
              // the thing that owns it.
              activeTool: sessionToolAtTurnEnd,
            });
          } catch (err) {
            // Swallowed on purpose — the buyer already has their answer, and
            // the next turn's client-resent history covers the gap. But a
            // ReferenceError here is NEVER a persistence outage: it means
            // this function closed over a binding declared below one of its
            // own call sites, which has now happened twice in this one
            // object (`startsFreshRequest`, then `itemTerm`) and is invisible
            // precisely because this catch hides it. Called out loudly so the
            // third one is found by reading a log instead of by a buyer
            // noticing a whole exchange vanished.
            if (err instanceof ReferenceError) {
              console.error(
                "[search] BUG: sendFinal read an uninitialised binding — a " +
                  "variable it closes over is declared below one of its call " +
                  "sites. Nothing was persisted for this turn.",
                err,
              );
            } else {
              console.error("[search] conversation persist failed:", err);
            }
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
          instagramLeads: [],
          vendorProducts: [],
          vendorProductsStore: null,
          buyerRequestOffer: null,
          buyerRequestOffered: false,
          backgroundItems: [],
          dualIntentItemALabel: null,
          awaitingBuyerRequestReply: false,
          buyerRequestMatchQuery: null,
          awaitingVendorSearchOffer: false,
          vendorSearchMatchQuery: null,
          recommendation: null,
          externalOffers: [],
          awaitingComparisonPurchaseReply: false,
          comparisonPickItem: null,
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

      // The composer's "+" tool badge (2026-09-06) — see toolAlignment.ts's
      // own top comment for the full reasoning. Runs before the (slower)
      // scope check for the same reason the gibberish check above does: a
      // message that doesn't fit the selected tool never needs to pay for
      // the rest of the pipeline. Modeled as a `clarification`, not a bare
      // reply — the ONLY reason being that isBillableTurn's own exemption
      // for "asked a question, showed nothing" requires a non-null
      // clarification to apply, and a buyer whose tool-mismatched message
      // was refused outright must not be charged for it. `skippable` is
      // deliberately absent: unlike the bare-query gate's own skip pill,
      // there is nothing useful to search for "as-is" here — the message
      // itself is the thing that doesn't fit.
      // ── THE SESSION'S ACTIVE TOOL (2026-09-10) ────────────────────────
      //
      // The composer clears its badge the instant a message is sent, so only
      // the FIRST message of a flow ever arrives carrying `activeTool` —
      // every follow-up looks toolless. That produced the same bug twice
      // separately (the reach-out offer, the comparison pick), each patched
      // with its own bespoke `awaiting…Reply` flag on the previous turn.
      //
      // This is the general rule, per explicit product direction: the tool
      // belongs to the CONVERSATION, and stays in play until one of exactly
      // two things happens —
      //   1. the buyer asks for something unrelated, or
      //   2. they open a new chat (a new conversation document, which starts
      //      with no tool by construction).
      //
      // (1) is `startsFreshRequest`, the route's own already-vetoed boundary
      // decision — but that is computed AFTER the scope check, well below
      // this point, and the compare branch needs a tool before then. So the
      // stored tool is adopted here and RELEASED further down, once the
      // boundary decision exists. The ordering is deliberate: an unrelated
      // message gets one turn of a stale tool at most, and the
      // tool-alignment check immediately below is what keeps even that from
      // mattering — a message that doesn't fit the tool is declined rather
      // than forced through it.
      const sessionTool = conversation?.activeTool ?? null;
      const activeTool = body?.activeTool ?? sessionTool ?? undefined;
      // Carried forward by default. Dropped only by the boundary decision
      // below (an unrelated request) — see there.
      sessionToolAtTurnEnd = activeTool ?? null;
      // Alignment is only ever checked against a tool the buyer EXPLICITLY
      // picked for THIS message. A tool inherited from earlier in the
      // session must never decline a message: "what about a matching one
      // too" is a perfectly good thing to say mid-comparison, and refusing
      // it because it doesn't read like a fresh comparison request would be
      // the stickiness turning into a cage.
      if (body?.activeTool && message.trim()) {
        const aligned = await checkToolAlignment({
          tool: body.activeTool,
          message,
        });
        if (!aligned) {
          const reply = toolMismatchReply(body.activeTool);
          await sendBareFinal(reply, { kind: "text", question: reply });
          return;
        }
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
            // The structural flag is the reliable signal (see its own
            // comment in types/search.ts — the freeform-phrasing bug this
            // fixes); the regex stays only as a fallback for history rows
            // persisted before this field existed.
            (turn.askedLocation || LOCATION_CLARIFY_PATTERN.test(turn.content)),
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
      let namesPlace = false;
      let hasMultipleIntents = false;
      // The scope check's own understanding of WHAT is being sought (see
      // classifyScopeTool's own comment) — the inputs to the bare-query
      // attribute gate further below. All three fail toward "don't ask":
      // a missing itemTerm or a true hasSpecificDetails both mean the gate
      // stays out of the way, which is the safe direction — a skipped
      // question costs a slightly thinner search, a wrong or repeated one
      // costs the buyer's patience.
      // (`itemTerm` itself is declared up beside `goalUpdate`, above
      // sendFinal — see its own comment on why.)
      let seekingKind: SearchIntentKind = "unclear";
      let hasSpecificDetails = true;
      // Defaults to "refinement" — the pre-signal behavior (full context
      // carries over). Failing toward "new" would mean a classifier
      // hiccup silently amputates a genuine mid-request follow-up, which
      // is far more disruptive than the leakage this signal exists to
      // stop.
      let requestRelation: RequestRelation = "refinement";
      // Whether the buyer is asking to WEIGH OPTIONS (see comparisonRule.ts).
      // Judged by the scope check below rather than by its own call behind a
      // keyword gate, which is what it used to be: that gate silently
      // dropped any comparison phrased in words it didn't list, and missed
      // three real buyer messages in a row. Defaults false — the safe
      // direction, since this only ever ADDS a comparison framing.
      let scopeSaysComparison = false;
      // The things being compared, as data. See classifyScopeTool's own note:
      // this is what lets code VERIFY each option was searched instead of
      // inferring it from whichever tool calls the model happened to make.
      let comparisonOptions: string[] = [];
      // Shopping Plan (2026-09-18) — does this request have a deadline, and
      // if so, what date. Defaults to no deadline. A deadline ALONE no
      // longer decides whether a request becomes a plan (2026-09-19,
      // explicit correction — see isBulkPurchase below for why): once a
      // plan IS otherwise qualified, these two say what date to track.
      let hasDeadline = false;
      let deadlineDate: string | null = null;
      // Shopping Plan's real trigger (2026-09-19, replacing "any request
      // with no stated deadline" — that fired on literally the first
      // message of every conversation, per classifyScopeTool's own
      // requestRelation rule that a first message is always "new", and
      // interrupted every ordinary single-item search with "when do you
      // need this by?" before anything was searched). A Shopping Plan is
      // now created ONLY when the buyer explicitly picks the tool from the
      // composer (activeTool === "shopping_plan", checked further down) OR
      // the message itself genuinely describes a multi-item list/project —
      // this flag. Defaults false, the safe direction: a missed bulk
      // request is answered as an ordinary search same as always; a false
      // positive would background-track something that was never meant to
      // be tracked.
      let isBulkPurchase = false;
      // Is the buyer asking YOU to explain/clarify your own last question,
      // rather than answering it (2026-09-17)? Found live: "Where can I get
      // a good fashion designer" → bareQueryGate asked what kind/occasion →
      // "Please explain" got a SECOND, near-identical clarifying question
      // instead of an actual explanation — the bare-query gate has no idea
      // it's being asked to elaborate, since it just sees "Please explain"
      // as a fresh, detail-free message and (correctly, on its own terms)
      // asks again. Defaults false, same safe direction as every other flag
      // here: this only ever ADDS the explain-and-re-ask branch below,
      // never replaces the ordinary answer path.
      let wantsExplanation = false;
      let asksForAdvice = false;

      // Was the LAST assistant turn a suggestBuyingGuidance reply (real-
      // world brand/model names offered on a genuine Velte dead end — see
      // that file's own header)? Detected off its own fixed closing
      // sentence, which only that function ever writes (confirmed unique —
      // see that file), the same idea as pendingComparisonPick further below
      // but without a matching structured field, since guidance never had
      // one.
      //
      // Found live: "Can I see the both?", replying to exactly two guidance
      // suggestions, got read as a fresh COMPARISON — weighing them against
      // each other and recommending one — even though the buyer's own word
      // ("both") is the literal disqualifier comparisonRule.ts's own text
      // already names ("two things they want BOTH of is not a comparison at
      // all"). The rule was right; nothing told the classifier THIS reply
      // was answering a guidance turn specifically, so it had no particular
      // reason to weight that boundary over the ordinary two-things-named
      // shape a real comparison also looks like. Computed here, BEFORE the
      // scope check below, so the classifier — which is what actually
      // decides isComparison, before any later short-circuit ever runs —
      // gets this context directly instead of being left to infer it from a
      // plain read of the prior turn's prose.
      const lastTurn = history.at(-1);
      const pendingGuidanceReply = Boolean(
        lastTurn?.role === "assistant" &&
        typeof lastTurn.content === "string" &&
        lastTurn.content.includes("I'll check what's actually on Velte."),
      );
      // Was the LAST assistant turn the vendor-search offer (2026-09-15)?
      // Structural, not text-detected (unlike pendingGuidanceReply just
      // above) — this offer's own QUESTION TEXT is picked CLIENT-SIDE
      // (SearchHome.tsx's own LOCAL_VENDOR_SEARCH_OFFER_QUESTIONS) and
      // never appears in `content`/history at all, unlike the older
      // Buyer-Request offer, whose question ("...want me to reach out and
      // ask?") is baked straight into the model's own reply text — which
      // is exactly why THAT offer's replies read correctly as "answer"
      // without needing this. Found live: "Yes, find someone", answering
      // this offer, got classified "new" (nothing in `content` looked like
      // a question was asked), which drops the earlier turns from the
      // model's own context AND fails isAnsweringVendorSearchOffer's own
      // `requestRelation !== "new"` guard further down — so the reply fell
      // through to the ordinary pipeline with no history, and the model,
      // reading "yes, find someone" as an orphaned message, reached for
      // its OWN extensively-documented Buyer-Request agreement handling
      // (the same literal canned text) and ran that instead — asking for a
      // name, then a WhatsApp number, on an offer that was never actually
      // made. Same fix shape as pendingGuidanceReply: hand the classifier
      // the fact directly rather than leaving it to infer "was I waiting
      // on something" from prose that was never written.
      const pendingVendorSearchOfferReply = Boolean(
        lastTurn?.role === "assistant" &&
        lastTurn.awaitingVendorSearchOffer === true,
      );
      // Was the LAST assistant turn a fresh-comparison Phase 1 answer,
      // closing with its own "want me to find/search Velte for X?" ask
      // (buildComparisonAnswerSystemPrompt's own closing instruction)?
      // Structural, like pendingVendorSearchOfferReply just above, and for
      // the same reason THAT one needed a structural flag rather than
      // text-detection: this offer's question IS real text in `content` (it
      // isn't client-side-only), but STEP 1 below only ever named FOUR kinds
      // of pending question (clarifying/location/name/buyer-request
      // reach-out) — a plain "search Velte for this?" ask is a fifth kind
      // the classifier had no reason to recognise as one of "something
      // asked", so it fell through to STEP 2 and could come back "new".
      // Found live: "Pick the best for me" (after a guidance dead-end) got
      // a genuine comparison-style pick ("I'd go with Bobbi Boss... Want me
      // to search Velte now for Bobbi Boss human hair wigs near you?"), and
      // "Yes please" in reply came back "new" — which not only starves
      // pendingComparisonPick further below (it hard-requires
      // `requestRelation !== "new"`, with no structural override the way
      // isStructuralContinuation gets one) but also left the ordinary
      // pipeline's own ambient "buyer just agreed to something earlier"
      // instinct as the only pattern the model had left to reach for —
      // which is the createBuyerRequest name-ask, since that's the only
      // "you agreed to my earlier offer" flow described anywhere in its
      // prompt. The buyer had agreed to a SEARCH, not a reach-out, and
      // never asked for one.
      const pendingComparisonOfferReply = Boolean(
        lastTurn?.role === "assistant" &&
        lastTurn.awaitingComparisonPurchaseReply === true,
      );

      if (message) {
        try {
          const scopeCheckMessages: ModelMessage[] = imageUrl
            ? [...historyMessages, { role: "user", content: message }]
            : messages;
          const scopeResult = await callLLM(
            {
              system: buildScopeCheckSystemPrompt(
                pendingGuidanceReply,
                pendingVendorSearchOfferReply,
                pendingComparisonOfferReply,
              ),
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
                aboutOtherPlatform: boolean;
                asksForAdvice: boolean;
                namesPlace: boolean;
                hasMultipleIntents: boolean;
                itemTerm: string | null;
                seekingKind: SearchIntentKind;
                requestRelation: RequestRelation;
                hasSpecificDetails: boolean;
                isComparison: boolean;
                comparisonOptions: string[];
                hasDeadline: boolean;
                isBulkPurchase: boolean;
                wantsExplanation: boolean;
              }
            | undefined;
          // Checked before the general off-topic decline — a question about
          // another shopping platform is shopping-shaped, so inScope reads it
          // as in scope, but Velte never compares, rates or recommends other
          // platforms (2026-09-23, explicit product rule). Its own wording:
          // the generic "doesn't look like something I can search for" line
          // would read oddly for a question that plainly is about shopping.
          //
          // Only when no item is named: the field alone also fires on a
          // passing mention ("I saw this phone on Jumia for 250k, can I get
          // it cheaper?" — tested), and that buyer wants the phone. With an
          // item, the turn searches for it and the main prompt's own rule
          // keeps the reply off the other platform.
          if (
            scopeOutput?.aboutOtherPlatform === true &&
            !scopeOutput.itemTerm?.trim() &&
            !imageUrl
          ) {
            await sendBareFinal(
              "I can't compare or recommend other shopping platforms — but I can help you find what you need right here on Velte, from real vendors near you. What are you shopping for?",
              null,
            );
            return;
          }
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
          scopeSaysComparison = scopeOutput?.isComparison ?? false;
          // Deduped and trimmed here rather than trusted as returned — the
          // model has been seen repeating an option and padding with empties.
          comparisonOptions = Array.from(
            new Set(
              (scopeOutput?.comparisonOptions ?? [])
                .map((o) => (typeof o === "string" ? o.trim() : ""))
                .filter(Boolean),
            ),
          ).slice(0, MAX_COMPARISON_OPTIONS);
          // hasDeadline is the model's call (does this message express a
          // timeframe at all — a judgment it's fine at); the actual DATE is
          // never the model's (see resolveDeadlineDate's own comment for
          // why — it used to be, and twice landed in 2023). false here
          // (message failed to parse despite the model saying it named a
          // date) is treated the same as no deadline at all — same safe
          // direction "no rush" already resolves to.
          hasDeadline = scopeOutput?.hasDeadline ?? false;
          deadlineDate = hasDeadline ? resolveDeadlineDate(message) : null;
          hasDeadline = hasDeadline && deadlineDate !== null;
          isBulkPurchase = scopeOutput?.isBulkPurchase ?? false;
          // A positive is double-checked by a focused call — see
          // confirmBulkPurchase.ts's header: this field came back true for
          // "3 plots of land" and "20 office chairs" alike. Skipped when the
          // buyer picked the Shopping Plan tool themselves (nothing to
          // second-guess) and on photo turns (the gate below never fires on
          // them anyway).
          if (isBulkPurchase && activeTool !== "shopping_plan" && !imageUrl) {
            isBulkPurchase = await confirmBulkPurchase([
              ...history.slice(-4).map((turn) => ({
                role: turn.role,
                content: turn.content,
              })),
              { role: "user" as const, content: message },
            ]);
          }
          wantsExplanation = scopeOutput?.wantsExplanation ?? false;
          asksForAdvice = scopeOutput?.asksForAdvice ?? false;
        } catch (err) {
          console.error("[search] scope check failed, failing open:", err);
        }
      }

      // "Please explain" answering something Velte just asked — the
      // bare-query gate or an ordinary askClarifyingQuestion both read as
      // plain assistant text by the time it's in `history` (SearchHistoryTurn
      // carries no raw clarification object — see its own comment — only the
      // per-gate booleans below), so this one check covers both by working
      // off `content` directly. Checked BEFORE every branch below: neither
      // knows they're being asked to elaborate on what THEY just said, so left
      // unhandled this reads as a fresh, detail-free message and produces
      // another variant of the same question — see explainClarification.ts's
      // own header for the live report this fixes ("Where can I get a good
      // fashion designer" → asked what kind/occasion → "Please explain" got
      // a second, near-identical question instead of an actual
      // explanation).
      //
      // Renders as a plain, non-skippable text clarification regardless of
      // what the ORIGINAL question was (even a bare-query-gate ask loses
      // its "Skip" pill on this one re-explained turn) — reconstructing the
      // exact original shape would need a generic "a clarification of some
      // kind was asked" flag SearchHistoryTurn doesn't carry today, and the
      // cost of not having it here is minor (the buyer can still just type
      // an answer) next to what building it would take. `wantsExplanation`
      // itself already requires the classifier to have judged that the last
      // turn asked something at all, so this isn't fired on an ordinary
      // reply with no question in it.
      //
      // ORed with isAskingForExplanation(message) (2026-09-22) — live-traced
      // on this exact request/history shape, repeatedly, on this branch
      // alone: `wantsExplanation` is one LLM judgment call on a short,
      // ambiguous phrase, and came back inconsistent turn to turn for the
      // identical "Can you explain please" reply — true some runs, false
      // (and once landing on a totally unrelated gate) on others. The
      // classifier's read is kept as the primary signal (it catches
      // phrasings no fixed pattern would); the regex is what makes the
      // common, easily-recognised phrasings ("please explain", "what do you
      // mean", "I don't understand") reliable regardless of that noise —
      // see isAskingForExplanation's own comment.
      if (
        (wantsExplanation || isAskingForExplanation(message)) &&
        lastTurn?.role === "assistant" &&
        lastTurn.content.trim()
      ) {
        const originalQuestion = lastTurn.content.trim();
        const explained = await explainClarification({
          originalQuestion,
          // storedGoal.itemTerm survives from whichever earlier turn FIRST
          // asked this question — far more reliable than THIS turn's own
          // itemTerm, which classifyScopeTool has nothing to resolve
          // "please explain" against on its own.
          itemTerm: storedGoal?.itemTerm ?? itemTerm ?? "",
        });
        // Falls back to the ORIGINAL question verbatim on any failure —
        // still answers "explain" with something, and keeps asking for the
        // same information rather than losing the thread entirely.
        const question = explained ?? originalQuestion;
        await sendBareFinal(question, { kind: "text", question });
        return;
      }

      // A genuinely FRESH comparison — the buyer just named two or more
      // DIFFERENT things to weigh against each other, from either route:
      // they picked the Compare tool (already confirmed genuine by
      // toolAlignment.ts above), or the scope check just recognised one in
      // their own words. This is the two-phase design's Phase 1 trigger
      // (2026-09-09, see comparisonRule.ts's own header) — answered
      // conversationally, below, with NO Velte search at all; the rich
      // comparison template is reserved for comparing different LISTINGS of
      // the SAME item, which only ever happens once the buyer commits to
      // one (see pendingComparisonPick right below).
      //
      // A scope-detected comparison needs at least two distinct options
      // (2026-09-23). Found live: "I saw a Tecno Camon 30 on Jumia for 250k,
      // can I get it cheaper?" came back isComparison with ONE option and
      // got "Between these, I'd go with Tecno Camon 30" instead of a search.
      // A picked Compare tool is exempt — toolAlignment.ts vetted that.
      //
      // Nor a bare acknowledgement ("yes", "ok") — measured 2026-09-23: a
      // "yes" to "Want me to find land in Enugu on Velte?", after an advice
      // answer naming Udi, Nkanu and Agbani, came back isComparison with
      // those areas as options, and got a comparison of them instead of the
      // search it had just agreed to. The options come from history; the
      // message itself compares nothing.
      const isFreshComparisonRequest =
        activeTool === "compare" ||
        (!activeTool &&
          scopeSaysComparison &&
          comparisonOptions.length >= 2 &&
          !isAcknowledgementReply(message));

      // Phase 2's own trigger: was the LAST assistant turn a fresh
      // comparison's own "want me to find it on Velte?" ask, and does this
      // message look like the buyer's reply to it rather than a clean break
      // to something else? Same guard shape as isAnsweringOffer further
      // below (a bare decline, or the classifier reading this as a brand
      // NEW request, both mean the buyer walked away rather than confirmed)
      // — deliberately generous otherwise, since a free-text reply naming a
      // DIFFERENT option from the same comparison ("actually get me the
      // Samsung") is still a confirmation of this same exchange, just not
      // of the original pick; the main call's own toolNote below is what
      // lets the model read that nuance from full conversation context.
      const lastComparisonTurn = history.at(-1);
      const pendingComparisonPick: string | null =
        lastComparisonTurn?.role === "assistant" &&
        lastComparisonTurn.awaitingComparisonPurchaseReply === true &&
        !isOfferDeclineReply(message) &&
        // `Boolean(body?.isContinuation) ||`, same audit fix as
        // isAnsweringOffer/isAnsweringVendorSearchOffer (2026-09-17) — this
        // reply currently has no dedicated button (see
        // renderOfferActions/SearchHome.tsx: a comparison pick's "want me
        // to search Velte for it?" is only ever answered by free text), so
        // `body?.isContinuation` is always false here today and this is
        // presently a no-op. Added anyway for parity with its siblings and
        // so a future button on this flow is covered automatically rather
        // than needing this exact audit repeated.
        (Boolean(body?.isContinuation) || requestRelation !== "new") &&
        typeof lastComparisonTurn.comparisonPickItem === "string" &&
        lastComparisonTurn.comparisonPickItem.trim()
          ? lastComparisonTurn.comparisonPickItem.trim()
          : null;

      // The turn's comparison verdict for everything downstream (the
      // template-vs-plain-picks branch near the end of this file): true for
      // BOTH phases — a fresh comparison (handled entirely by the
      // short-circuit right below, never reaching that branch) and a
      // confirmed pick's own single-item search (which DOES reach it, and
      // is exactly what should render through the rich template).
      const isCompareTurn =
        isFreshComparisonRequest || pendingComparisonPick !== null;

      // A COMPARISON IS NEVER A DUAL INTENT (2026-09-05, found live: "I want
      // to buy a new car, Toyota 2026 model and Lexus Jeep 2026 model, which
      // one should I buy" came back isComparison:true AND
      // hasMultipleIntents:true, and the dual-intent split won — so Velte
      // searched ONE of the two cars, found nothing, and dead-ended on it).
      //
      // The two are mutually exclusive BY DEFINITION, and comparisonRule.ts
      // already says so in the words the classifier is given: comparison
      // alternatives are things the buyer picks ONE of, dual intents are
      // things they want BOTH of. When both come back true the classifier has
      // contradicted itself, and comparison is the reading to keep — it is
      // the more specific claim ("weigh these against each other" entails
      // that two things were named; naming two things does not entail
      // wanting both).
      //
      // Forced HERE, at the one point isCompareTurn is derived, rather than
      // by adding `&& !isCompareTurn` to each branch that reads
      // hasMultipleIntents. There are three such branches today, and the
      // whole reason this bug existed is that a per-site exemption has to be
      // remembered by every site added later — and one of them wasn't.
      if (isCompareTurn) hasMultipleIntents = false;

      // Phase 1's own short-circuit (2026-09-09) — a FRESH comparison
      // between different items never enters the ordinary search pipeline
      // at all: nothing is searched, on purpose (see comparisonRule.ts's
      // header and buildComparisonAnswerSystemPrompt's own comment). A
      // dedicated, narrow call outside the big multi-tool loop, ending the
      // turn here.
      //
      // Keyed on isFreshComparisonRequest ALONE, deliberately, not also on
      // `pendingComparisonPick === null` — this message's OWN words already
      // won that judgment call (the scope check, or an explicit Compare tool
      // selection), and that must outrank a stale flag left on the PREVIOUS
      // turn. A buyer who moves straight from confirming one comparison to
      // asking a brand new one ("actually, compare Xiaomi vs Samsung
      // instead") must get Phase 1 again, not have their new request
      // silently read as confirming the old pick just because
      // requestRelation misjudged it as "answer" rather than "new" — the
      // classifier is good, not perfect (measured 91% elsewhere in this
      // file), and this message's own explicit signal is the one sure
      // thing. The confirmation turn itself never has this problem: a bare
      // "yes" carries no comparison words of its own, so
      // isFreshComparisonRequest is false for it and this block simply
      // doesn't run — pendingComparisonPick is what routes THAT turn,
      // further down.
      if (isFreshComparisonRequest) {
        // Released the instant Phase 1 has answered (found live, 2026-09-21
        // — a buyer stuck answering "just give me the best"/"return top
        // overall matches" three turns in a row and never once got an
        // actual search). Without this, `sessionToolAtTurnEnd` carried
        // "compare" forward with NO reset anywhere for the compare tool —
        // unlike shopping_plan just above, which clears itself the instant
        // its own job (creating the plan) is done — so `activeTool` stayed
        // "compare" on every later turn too (`body?.activeTool ?? sessionTool`
        // at this file's own top), which forces `isFreshComparisonRequest`
        // true again on literally every reply. That re-entered THIS SAME
        // Phase-1 branch over and over — the one whose own system prompt
        // says "do not call any other tool this turn, nothing should be
        // searched yet" — so the buyer's confirmation never reached
        // `pendingComparisonPick`/the real search pipeline at all, and the
        // client's badge (SearchHome.tsx's `setActiveTool(event.activeTool)`
        // re-sync) never stopped showing "Compare" either. Phase 1's job is
        // done the moment it delivers its verdict and asks "want me to
        // check Velte?" — `pendingComparisonPick` resolves that follow-up
        // from conversation HISTORY (`awaitingComparisonPurchaseReply`), not
        // from this tool flag, so clearing it here costs that handoff
        // nothing.
        sessionToolAtTurnEnd = null;
        push(["Weighing up your options…", "Thinking this through…"]);
        const compareProviderOrder: ("openai-strong" | "openai" | "groq")[] =
          imageUrl
            ? ["openai-strong", "openai"]
            : ["openai-strong", "openai", "groq"];
        let pickItem: string | null = null;
        let reply = "";
        try {
          const compareResult = await callLLM(
            {
              system: buildComparisonAnswerSystemPrompt(comparisonOptions),
              messages,
              tools: { comparisonPick: comparisonPickTool() },
              stopWhen: stepCountIs(2),
            },
            compareProviderOrder,
            "comparison-answer",
          );
          reply = sanitizeReply(compareResult.text);
          const pickOutput = compareResult.toolResults.find(
            (r) => r.toolName === "comparisonPick",
          )?.output as { pickItem?: string } | undefined;
          pickItem =
            pickOutput?.pickItem?.trim() || comparisonOptions[0] || null;
        } catch (err) {
          console.error("[search] comparison answer failed:", err);
        }
        if (!reply) {
          reply =
            "Sorry, something went wrong comparing those — mind trying again?";
          pickItem = null;
        } else if (looksLikeStructuredBreakdown(reply)) {
          // Compliance backstop, not a rewording preference (2026-09-15,
          // found live — see looksLikeStructuredBreakdown's own header for
          // the exact failure this catches). buildComparisonAnswerSystemPrompt
          // already SAYS "a few natural sentences... never a wall of text,
          // never a rigid table" and "name the ONE option you'd actually
          // recommend" — a model that ignores this instead of complying
          // still has to supply `pickItem` correctly via the forced-shape
          // tool call above, so the buyer is never left with no pick at
          // all, just a plainer sentence than a compliant turn would have
          // written. This generalizes to ANY comparison, any category —
          // nothing here names generators, phones, or any specific item.
          console.warn(
            "[search] comparison-answer reply violated the 'few sentences, one pick' rule — replacing with a safe deterministic line",
          );
          reply = pickItem
            ? `Between these, I'd go with **${pickItem}** — want me to check what's available on Velte?`
            : "Between these, here's my take — want me to check what's available on Velte?";
        }
        await sendFinal({
          type: "final",
          reply,
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
          externalStoreSuggestions: [],
          instagramLeads: [],
          vendorProducts: [],
          vendorProductsStore: null,
          buyerRequestOffer: null,
          buyerRequestOffered: false,
          backgroundItems: [],
          dualIntentItemALabel: null,
          awaitingBuyerRequestReply: false,
          buyerRequestMatchQuery: null,
          awaitingVendorSearchOffer: false,
          vendorSearchMatchQuery: null,
          recommendation: null,
          externalOffers: [],
          // Only an open exchange when there's actually a pick to confirm —
          // the error-fallback reply above has none, and asking the buyer
          // to confirm "null" would be nonsense.
          awaitingComparisonPurchaseReply: Boolean(pickItem),
          comparisonPickItem: pickItem,
          // The FULL alternative list, not just the pick — see this field's
          // own comment in types/search.ts. What lets a later "the other
          // one" (even after an intervening dead-end turn) resolve to the
          // untried alternative instead of getting re-asked which one they
          // mean.
          comparisonOptions: pickItem ? comparisonOptions : null,
        });
        controller.close();
        return;
      }

      // A buying QUESTION is answered before anything is searched
      // (2026-09-23 — see adviceAnswer.ts's header for the live case). Runs
      // after the comparison short-circuit on purpose: the classifier also
      // flags a named comparison as advice, and that must stay a comparison.
      // Closes as an open offer the next turn's "yes" resolves through
      // pendingComparisonPick, exactly like a comparison's own pick.
      if (
        asksForAdvice &&
        !isCompareTurn &&
        !imageUrl &&
        !activeTool &&
        message
      ) {
        push(["Thinking this through…", "Looking into that for you…"]);
        const advice = await answerBuyingQuestion(
          [
            ...history.slice(-6).map((turn) => ({
              role: turn.role,
              content: turn.content,
            })),
            { role: "user" as const, content: message },
          ],
          itemTerm,
        );
        if (advice) {
          await sendFinal({
            type: "final",
            reply: advice.reply,
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
            externalStoreSuggestions: [],
            instagramLeads: [],
            vendorProducts: [],
            vendorProductsStore: null,
            buyerRequestOffer: null,
            buyerRequestOffered: false,
            backgroundItems: [],
            dualIntentItemALabel: null,
            awaitingBuyerRequestReply: false,
            buyerRequestMatchQuery: null,
            awaitingVendorSearchOffer: false,
            vendorSearchMatchQuery: null,
            recommendation: null,
            externalOffers: [],
            awaitingComparisonPurchaseReply: Boolean(advice.searchTerm),
            comparisonPickItem: advice.searchTerm,
            comparisonOptions: null,
          });
          controller.close();
          return;
        }
        // A failed answer falls through to the ordinary search — the buyer
        // still gets something, just without the advice.
      }

      // Shopping Plan — conversational management (Phase 3, 2026-09-19,
      // spec §23): "pause this plan", "increase my budget to ₦250k",
      // "remove the school bag". Checked BEFORE anything else below
      // assumes this is a NEW request — a buyer with an open plan might be
      // talking about IT instead. Only even queries for plans when signed
      // in (plans require an account) and only spends a model call when at
      // least one actually exists, so this costs nothing for the vast
      // majority of turns/buyers that have none.
      if (!isCompareTurn && actorType !== "guest" && message) {
        try {
          const { plans: manageablePlans } = await backendData<{
            plans: ManageablePlanContext[];
          }>("/shopping-plans/manageable", {
            cookie: actorCookie ?? undefined,
          });

          if (manageablePlans.length) {
            const managed = await classifyShoppingPlanManagement({
              message,
              plans: manageablePlans,
              requestRelationHint: requestRelation,
            });

            if (managed?.applies) {
              if (managed.action !== "none" && managed.planId) {
                const ok = await applyShoppingPlanManagement(
                  managed,
                  actorCookie,
                );
                await sendBareFinal(
                  ok
                    ? managed.confirmationReply
                    : "Sorry, something went wrong making that change — mind trying again?",
                  null,
                );
              } else {
                // Genuinely about a plan, but nothing concrete to act on
                // yet (ambiguous which plan, or a question rather than a
                // change) — confirmationReply carries the model's own
                // clarifying question/answer.
                await sendBareFinal(managed.confirmationReply, null);
              }
              return;
            }
          }
        } catch (err) {
          // Never blocks the turn — a failed check here just means this
          // message gets handled as an ordinary search instead, same
          // "must only ever ADD, never be the reason a buyer sees nothing"
          // rule every other gate in this file follows.
          console.error("[shopping-plan] management check failed:", err);
        }
      }

      // Shopping Plan (2026-09-18) — was this turn's reply TO the deadline
      // question below, rather than a fresh request of its own? Structural,
      // set from the clarification's own shape (never guessed from prose),
      // same rule askedLocation/askedBudget already follow. When true, the
      // buyer's own reply ("in 3 weeks", "no rush") names no item at all —
      // the ORIGINAL request, one substantive user turn back, is what
      // actually describes what to plan/search for.
      const isAnsweringDeadlineAsk = Boolean(
        lastTurn?.role === "assistant" && lastTurn.askedDeadline === true,
      );
      const effectiveGoalMessage = isAnsweringDeadlineAsk
        ? (lastSubstantiveUserMessage(history) ?? message)
        : message;

      // Shopping Plan (2026-09-19) — the budget ask's own reply-tracking,
      // mirroring isAnsweringDeadlineAsk exactly. Reads the goal/deadline
      // back off the ask turn's own carry-forward fields (stamped when that
      // question was asked, below) rather than walking history a second
      // time — lastSubstantiveUserMessage only ever skips back ONE
      // clarification hop, and budget is now a SECOND chained ask behind
      // deadline, so re-deriving it the same way would land on the deadline
      // reply ("by Friday") rather than the original request.
      const isAnsweringShoppingPlanBudgetAsk = Boolean(
        lastTurn?.role === "assistant" &&
        lastTurn.askedShoppingPlanBudget === true,
      );
      const pinnedGoalText = isAnsweringShoppingPlanBudgetAsk
        ? (lastTurn?.shoppingPlanPendingGoalText ?? effectiveGoalMessage)
        : effectiveGoalMessage;
      const pinnedHasDeadline = isAnsweringShoppingPlanBudgetAsk
        ? true
        : hasDeadline;
      const pinnedDeadlineDate = isAnsweringShoppingPlanBudgetAsk
        ? (lastTurn?.shoppingPlanPendingDeadlineDate ?? deadlineDate)
        : deadlineDate;
      // The buyer's own budget figure, read deterministically off whichever
      // turn actually states it — CODE, never the model (resolveBudgetNaira
      // is the same "translate, don't invent" discipline resolveDeadlineDate
      // already follows for dates). This turn's own text first (covers
      // answering the budget question directly, or naming a deadline AND a
      // budget in the same reply); when this turn IS the direct answer to
      // our own budget question, retry leniently (a bare number needs no
      // ₦/naira/k/m marker there — the question itself is the marker); the
      // resolved goal text otherwise (covers stating everything up front:
      // "furnish my apartment by Friday, budget ₦300k").
      const resolvedShoppingPlanBudgetNaira =
        resolveBudgetNaira(message || "") ??
        (isAnsweringShoppingPlanBudgetAsk
          ? resolveBudgetNairaLenient(message || "")
          : null) ??
        (pinnedGoalText ? resolveBudgetNaira(pinnedGoalText) : null);

      // Ask about a deadline once a request has already qualified for a
      // Shopping Plan some other way, but doesn't say by when (2026-09-19,
      // replacing a gate that fired on `requestRelation === "new"` alone —
      // true of the first message of every conversation, per
      // classifyScopeTool's own rule — which meant EVERY fresh, single-item
      // search got interrupted with "when do you need this by?" before
      // anything was searched. The real qualifier now is the explicit tool
      // pick or isBulkPurchase below, never a bare deadline-less message.
      // Never on a refinement (not qualified independently, it rides
      // whatever the original request already decided), and never when
      // this turn is itself the answer to this same question
      // (`!isAnsweringDeadlineAsk`, belt-and-suspenders against a rare
      // misclassification re-triggering the same ask forever). Skippable —
      // unlike the budget ask below, the buyer can always search right now
      // without naming a date. The length floor is a cheap
      // backstop against asking a bare greeting ("hi") when it does — not
      // a keyword heuristic, just ruling out messages too short to be a
      // real request at all.
      if (
        !isCompareTurn &&
        !imageUrl &&
        !hasDeadline &&
        !isAnsweringDeadlineAsk &&
        !isAnsweringShoppingPlanBudgetAsk &&
        (activeTool === "shopping_plan" || isBulkPurchase) &&
        message &&
        message.trim().length >= 8
      ) {
        const dynamicQuestion = await buildDeadlineAskGate(message);
        const question = composeDeadlineAskReply(dynamicQuestion);
        await sendBareFinal(question, {
          kind: "text",
          question,
          skippable: true,
          deadlineAsked: true,
        });
        return;
      }

      // Shopping Plan (2026-09-19, explicit product direction) — budget is
      // REQUIRED before a plan is created, and deliberately NOT skippable
      // (unlike the deadline ask just above): Velte never estimates a price
      // of its own any more (buildShoppingPlanSnapshot.ts no longer asks the
      // model for one — see that file's own header), so without a real,
      // buyer-stated figure there is nothing for the real, searched prices
      // to later be checked against (shoppingPlan.job.js's own
      // budgetStatusFor — "match price of what we've found against the
      // budget"). Fires once the deadline is settled (stated up front, or
      // just resolved by the ask above) but no budget figure has been
      // resolved from anything said so far — INCLUDING a re-ask when the
      // buyer's own reply to this exact question didn't contain a parseable
      // figure (`isAnsweringShoppingPlanBudgetAsk` is deliberately NOT
      // excluded here, unlike the deadline ask above): found live, "around
      // 2000000" (no ₦/naira/k/m marker) failed to parse and silently
      // dropped the buyer out of the whole flow into an unrelated
      // location-ask instead of asking again — re-prompting is the correct
      // behavior for an unparseable answer, not a bug to guard against.
      if (
        !isCompareTurn &&
        !imageUrl &&
        pinnedHasDeadline &&
        pinnedDeadlineDate &&
        resolvedShoppingPlanBudgetNaira == null &&
        (activeTool === "shopping_plan" ||
          isBulkPurchase ||
          isAnsweringDeadlineAsk ||
          isAnsweringShoppingPlanBudgetAsk) &&
        pinnedGoalText
      ) {
        const dynamicQuestion = await buildBudgetAskGate(
          pinnedGoalText,
          pinnedDeadlineDate,
          isAnsweringShoppingPlanBudgetAsk,
        );
        const question = composeBudgetAskReply(
          dynamicQuestion,
          isAnsweringShoppingPlanBudgetAsk,
        );
        await sendFinal({
          type: "final",
          reply: question,
          toolCalled: false,
          clarification: {
            kind: "text",
            question,
            shoppingPlanBudgetAsked: true,
            shoppingPlanPendingGoalText: pinnedGoalText,
            shoppingPlanPendingDeadlineDate: pinnedDeadlineDate,
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
          instagramLeads: [],
          vendorProducts: [],
          vendorProductsStore: null,
          buyerRequestOffer: null,
          buyerRequestOffered: false,
          backgroundItems: [],
          dualIntentItemALabel: null,
          awaitingBuyerRequestReply: false,
          buyerRequestMatchQuery: null,
          awaitingVendorSearchOffer: false,
          vendorSearchMatchQuery: null,
          recommendation: null,
          externalOffers: [],
          awaitingComparisonPurchaseReply: false,
          comparisonPickItem: null,
        });
        controller.close();
        return;
      }

      // A qualifying request (explicit tool pick, a genuine bulk/project
      // request, or the answer to this flow's own deadline/budget asks —
      // `isAnsweringDeadlineAsk`/`isAnsweringShoppingPlanBudgetAsk` are only
      // ever true here because an earlier turn already qualified it) becomes
      // a persistent, background-monitored plan instead of an immediate
      // search, once a deadline SHOPPING_PLAN_MIN_DAYS+ away AND a real
      // budget are both known: real, verified per-item search happens later,
      // in velte-backend's own recurring monitoring job, never during this
      // turn. Ends the turn here with a short confirmation, same shape as
      // the comparison short-circuit above.
      if (
        !isCompareTurn &&
        (activeTool === "shopping_plan" ||
          isBulkPurchase ||
          isAnsweringDeadlineAsk ||
          isAnsweringShoppingPlanBudgetAsk) &&
        pinnedHasDeadline &&
        pinnedDeadlineDate &&
        resolvedShoppingPlanBudgetNaira != null &&
        pinnedGoalText
      ) {
        const daysUntilDeadline = daysUntilIsoDate(pinnedDeadlineDate);
        if (
          daysUntilDeadline !== null &&
          daysUntilDeadline >= SHOPPING_PLAN_MIN_DAYS
        ) {
          // Corrects the auto-detected-deadline path, which had no way to
          // know this turn would become a Shopping Plan back when
          // `turnAction` was first priced (before classification ran) — see
          // that assignment's own comment. A no-op for the explicit-tool
          // path, which already set this early.
          turnAction = "shopping_plan";
          push(buildingShoppingPlanPhrase());
          const draft = await buildShoppingPlanSnapshot({
            goalText: pinnedGoalText,
          });
          if (!draft) {
            await sendBareFinal(
              "Sorry, something went wrong putting that plan together — mind trying again?",
              null,
            );
            return;
          }

          let planId: string | null = null;
          try {
            const created = await backendData<{ plan: { id: string } }>(
              "/shopping-plans",
              {
                method: "POST",
                cookie: actorCookie ?? undefined,
                body: {
                  goalText: pinnedGoalText,
                  items: draft.items,
                  deadlineDate: pinnedDeadlineDate,
                  budgetNaira: resolvedShoppingPlanBudgetNaira,
                  conversationId: conversation?.conversationId ?? null,
                  deviceId,
                  // Deterministic, not a fresh UUID — a genuine retry of
                  // the SAME message/deadline collides on the backend's
                  // own (clientRef, owner) unique index and returns the
                  // already-created plan instead of a duplicate. Coarser
                  // than a real per-submit id (none is sent to this
                  // endpoint today), but this endpoint has no double-click
                  // button the way the deleted Shopping List's "Get these
                  // items" did — the risk this guards is a rare retried
                  // request, not routine rapid re-submission.
                  clientRef:
                    `${deviceId ?? "guest"}:${pinnedGoalText.trim().toLowerCase()}:${pinnedDeadlineDate}`.slice(
                      0,
                      200,
                    ),
                  location: body?.buyerLocation
                    ? {
                        lat: body.buyerLocation.lat,
                        lng: body.buyerLocation.lng,
                      }
                    : undefined,
                },
              },
            );
            planId = created.plan.id;
          } catch (err) {
            console.error("[shopping-plan] create failed:", err);
          }

          if (!planId) {
            await sendBareFinal(
              "Sorry, something went wrong creating your Shopping Plan — mind trying again?",
              null,
            );
            return;
          }

          // Released the moment the plan actually exists (found live,
          // 2026-09-19): `sessionToolAtTurnEnd` otherwise carries
          // "shopping_plan" into every later turn (same "carried forward by
          // default" rule its own declaration explains), so an ordinary
          // closing remark like "I think the list is fine" — no date in it,
          // requestRelation not "new" since it's clearly replying to what
          // was just said, so the OTHER reset never fires either — kept
          // tripping the deadline-ask gate all over again as though a
          // second plan were being built. This flow's job is done the
          // instant the plan is created; nothing later in this same
          // conversation is still "about" building it.
          sessionToolAtTurnEnd = null;

          const snapshot: ShoppingPlanSnapshot = {
            planId,
            goalText: pinnedGoalText,
            deadlineDate: pinnedDeadlineDate,
            budgetNaira: resolvedShoppingPlanBudgetNaira,
            itemCount: draft.items.length,
            items: draft.items.map((it) => ({
              label: it.label,
              quantity: it.quantity,
            })),
          };

          // The chat-inline shopping list per explicit product direction
          // (2026-09-19): the buyer sees the actual items right here, not
          // just a count pointing elsewhere, and knows both WHAT happens
          // next (a real search just started, never an estimate) and HOW
          // they'll hear back (push, the same channel shoppingPlan.job.js's
          // own digest already uses — SMS too, for whoever has it enabled).
          // Adding/removing an item is answered in plain language right in
          // this same chat (manageShoppingPlanTool.ts), named here so it
          // isn't a hidden feature.
          const displayItems = draft.items.slice(0, 10);
          const itemLines = displayItems
            .map(
              (it) =>
                `- ${it.label}${it.quantity > 1 ? ` (×${it.quantity})` : ""}`,
            )
            .join("\n");
          const remaining = draft.items.length - displayItems.length;
          const reply = [
            `Your Shopping Plan is set up${draft.items.length > 1 ? ` for ${draft.items.length} items` : ""} — budget ${formatNairaForReply(resolvedShoppingPlanBudgetNaira)}, by ${formatDeadlineForReply(pinnedDeadlineDate)}:`,
            remaining > 0
              ? `${itemLines}\n- …and ${remaining} more`
              : itemLines,
            `I've started searching for these now, and I'll keep checking real prices and availability against your budget until your deadline — never an estimate of my own. I'll notify you by push (and SMS too, if you've turned that on) the moment I find real options, and you can open Shopping Plans any time to see progress. Just tell me here if you want to add or remove anything.`,
          ].join("\n\n");

          await sendFinal({
            type: "final",
            reply,
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
            externalStoreSuggestions: [],
            instagramLeads: [],
            vendorProducts: [],
            vendorProductsStore: null,
            buyerRequestOffer: null,
            buyerRequestOffered: false,
            backgroundItems: [],
            dualIntentItemALabel: null,
            awaitingBuyerRequestReply: false,
            buyerRequestMatchQuery: null,
            awaitingVendorSearchOffer: false,
            vendorSearchMatchQuery: null,
            recommendation: null,
            externalOffers: [],
            awaitingComparisonPurchaseReply: false,
            comparisonPickItem: null,
            shoppingPlan: snapshot,
          });
          controller.close();
          return;
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
      //
      // AUDITED 2026-09-17 (explicit request, following two live misreads
      // the same day — the vendor-search offer and a suggestBuyingGuidance
      // reply) for every OTHER "the last turn was waiting on something"
      // flag that belonged in this same list and wasn't here yet:
      // - awaitingVendorSearchOffer was missing entirely. Its own
      //   short-circuit (isAnsweringVendorSearchOffer) doesn't itself
      //   depend on `messages`, so this gap wasn't the direct cause of that
      //   bug — but if that short-circuit's OWN guard ever fails to fire
      //   (a decline-phrase edge case, an empty vendorSearchMatchQuery),
      //   the turn falls through to the ordinary pipeline, and THAT is
      //   exactly where a wiped history would compound the failure the
      //   same way the original "yes, find someone" bug did. Belongs here
      //   for the same reason its siblings do.
      // - isGuidanceReply was missing too. A guidance reply has no button
      //   (SearchHome only ever renders it as plain suggested text), so
      //   there is no isContinuation signal for it and requestRelation is
      //   the only thing standing between this reply and a correct read —
      //   guidanceRequestRelationNote (systemPrompt.ts) narrows how often
      //   it says "new", but can't guarantee it never does. Keeping
      //   history intact on the residual misread at least leaves the
      //   model able to see its OWN prior suggestions in `content` and
      //   recover, rather than answering an orphaned "all of them" with
      //   nothing before it.
      const isStructuralContinuation =
        Boolean(body?.isContinuation) ||
        history.at(-1)?.awaitingBuyerRequestReply === true ||
        history.at(-1)?.awaitingComparisonPurchaseReply === true ||
        history.at(-1)?.awaitingVendorSearchOffer === true ||
        history.at(-1)?.isGuidanceReply === true;
      // Reassigns the `let` declared up near `messages`/`history` above —
      // see that declaration's own comment for why this is no longer a
      // `const` here.
      startsFreshRequest =
        requestRelation === "new" &&
        historyMessages.length > 0 &&
        !isStructuralContinuation;
      if (startsFreshRequest) {
        messages = [{ role: "user", content }];
        // RESET #1 of the two the product rule names (2026-09-10): the buyer
        // has moved to something unrelated, so whatever tool the last request
        // was using no longer applies. Reset #2 — a new chat — needs no code:
        // it's a new conversation document, which starts with no tool.
        //
        // This is the same signal that already wipes the goal sheet, and for
        // the same reason: both are "facts about the request in play", and a
        // request that has been replaced shouldn't leave its settings behind.
        sessionToolAtTurnEnd = null;
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
      // (storedGoal itself is declared earlier now — see its own comment.)
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
          priorText && hasGenuineDualIntentPhrasing(priorText),
        );
      }

      // Whether location was specifically DECLINED (not shared) earlier in
      // this conversation — the Phase 5 structural record, same source
      // alreadyAskedLocationThisConversation's own second OR-clause already
      // reads. A buyer who SHARED location keeps sending it on every later
      // request (see buyerLocationRef in SearchHome.tsx, resent from the
      // conversation's own stored state), so reaching the gate below with
      // `!body?.buyerLocation` still true AND this flag true is the only
      // way that combination happens — it can never mean "shared, but this
      // request forgot to resend it."
      const locationDeclinedEarlier = Boolean(
        conversation?.buyerLocation?.declined,
      );

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
      // Skipped when the buyer's device location is already known or this
      // message (or an earlier one) already named a place — but NOT simply
      // because location was already asked once (2026-09-16, per explicit
      // request): a decline was an answer for THAT request, not a standing
      // policy for every request afterward. A genuinely NEW request
      // (`startsFreshRequest`) with location still off asks again — just
      // with different wording (below) that acknowledges the earlier
      // decline instead of repeating the same ask verbatim. A CONTINUATION
      // of the same still-open request never re-asks (that's what
      // `alreadyAskedLocationThisConversation` alone continues to guard,
      // unchanged from before).
      if (
        message &&
        !imageUrl &&
        !body?.buyerLocation &&
        !namesPlace &&
        (!alreadyAskedLocationThisConversation ||
          (locationDeclinedEarlier && startsFreshRequest)) &&
        // A COMPARISON is not a proximity question (2026-09-05, per explicit
        // request). "Which do I pick, Infinix or Samsung" asks which PRODUCT
        // is the better buy — the answer is the same in Enugu as in Lagos,
        // and interrupting it to ask where the buyer is reads as not having
        // understood the question at all.
        //
        // It also caused a second, worse failure. Answering this gate
        // produces a CONTINUATION turn whose whole text is "Shared my
        // location" / "Search without sharing my location" — and the
        // composer clears its tool badge on send, so that continuation
        // arrived with no activeTool and no comparison words in it. The
        // turn that actually ran the search was therefore not a compare
        // turn at all: no per-item searches, no template, just ordinary
        // picks. Not asking is what keeps the comparison on ONE turn.
        //
        // This used to end by crediting a `compareIntentSource` with covering
        // every other continuation shape. NO SUCH THING EXISTS — it was never
        // written, or was removed without the comment following it, and it
        // read as a guarantee that something else had the case in hand. What
        // actually protects a continuation turn is that the scope check
        // re-reads isComparison from the conversation history (verified: the
        // canned "Search without sharing my location" still comes back
        // isComparison:true with the original turn above it), plus
        // `locationAskIsPointless` further down, which catches the ask
        // whichever path produced it.
        !isCompareTurn
      ) {
        try {
          // Two different asks for two different moments. The FIRST time
          // this conversation ever needs a location, it's a plain request.
          // The SECOND+ time — this exact turn only reachable when the
          // buyer already declined once AND this is a genuinely new request
          // — repeating the identical question would read as if Velte
          // never registered their answer. Re-confirms instead: names what
          // they chose last time (nationwide) and asks, for THIS new
          // request specifically, whether that still stands or they'd
          // rather narrow it down now — the buyer's own words from the
          // task description ("Do you still want to search nationwide or
          // do you prefer one close to you?").
          const locationOnlySystem = locationDeclinedEarlier
            ? `The buyer just asked: "${message}". This is a NEW, separate request from whatever they searched before. Earlier in this conversation they chose to search nationwide rather than share their location — that choice was about the EARLIER request, not a standing policy, so ask again for THIS one. Call the askClarifyingQuestion tool with kind: "location" and a short, natural, ONE-sentence \`question\` that acknowledges they searched nationwide before and asks whether they'd still like to search nationwide for this new request, or would rather share their location this time to find something closer — make clear this is only to find nearby vendors, never to track them. Do not ask about anything else this turn, and do not call any other tool.`
            : `The buyer just asked: "${message}". Their location is unknown — neither a device location nor a named place exists for this search, and this search needs one. Call the askClarifyingQuestion tool with kind: "location" and a short, natural, ONE-sentence \`question\` asking for their location so you can find vendors actually near them — make clear this is only to find nearby vendors, never to track them. Do not ask about anything else this turn, and do not call any other tool.`;
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

      // The deterministic bare-query BUDGET+ gate (reworked 2026-09-04 from
      // an ATTRIBUTE gate, widened 2026-09-05) — the details sibling of the
      // proactive location gate above, same lesson applied: leaving "ask
      // about missing details" to the model's own judgment meant a bare
      // "laptop" usually searched immediately with nothing to rank on. Runs
      // AFTER the location gate on purpose (location first, then this);
      // fires at most once per conversation (the history scan below, same
      // technique as alreadyAskedLocationThisConversation).
      //
      // BUDGET is always asked, hardcoded, never left to the model — the one
      // thing genuinely missing and useful across EVERY category, so it's
      // guaranteed rather than trusted to a per-turn judgment. What rides
      // alongside it is now DYNAMIC (bareQueryGate.ts) rather than either a
      // fixed per-sector spec list OR nothing: "I need a good laptop for my
      // work as a developer" and "a good phone for content creation" already
      // NAME the use case, so re-asking a spec off a list (Processor,
      // Storage Capacity) would be asking for something a shopping
      // consultant wouldn't need — but the SAME use case is exactly what
      // makes "what kind of development" or "mostly photo or video" worth
      // asking, which a fixed field list has no way to know to offer. See
      // bareQueryGate.ts's own top comment for what's asked and why the
      // buying-criteria guidance shown alongside it stays spec-only (never a
      // named product/brand — that stays suggestBuyingGuidance.ts's own
      // narrower, dead-end-only exception). A buyer who states a budget in
      // their own words already flips `hasSpecificDetails` true upstream
      // (see classifyScopeTool's own field description, which lists budget
      // explicitly) and never reaches this gate at all.
      //
      // On a continuation turn this only ever fires for the LOCATION
      // gate's own answers (shared or declined) — resolving the original
      // request via lastSubstantiveUserMessage — never for a reply to any
      // other question (including this gate's own: hijacking an answer
      // turn to re-ask would loop the buyer).
      const BUDGET_CLARIFY_PATTERN = /what'?s your budget/i;
      // Request-scoped, unlike the LOCATION marker above which stays
      // buyer-scoped: having asked about the last item's budget says
      // nothing about the new one, so a fresh request earns a fresh ask
      // (once). This is the same buyer-vs-request distinction the history
      // reset above turns on.
      //
      // `turn.askedBudget` itself (2026-09-17): staffly-ai-backend now
      // derives this from BOTH `skippable: true` (this gate's own
      // signature) AND the clarification's own `budgetAsked: true` — a
      // bare-query turn that skipped budget on purpose (a mechanic, a
      // repair — see bareQueryGate.ts's own rule) must not read as "budget
      // already asked" and block a later, genuinely budget-relevant ask
      // within the same request.
      const alreadyAskedBudgetThisConversation =
        !startsFreshRequest &&
        history.some(
          (turn) =>
            turn.role === "assistant" &&
            // Same fix as alreadyAskedLocationThisConversation above — the
            // structural flag first, the fixed-phrase regex only as a
            // fallback for pre-migration history rows.
            (turn.askedBudget || BUDGET_CLARIFY_PATTERN.test(turn.content)),
        );
      // Same request-scoped shape, for suggestBuyingGuidance (found live,
      // 2026-09-15): a guidance reply's own suggestions confirmed via the
      // comparison Phase 1/2 hop ("pick the best for me" → "Luminous 2KVA"
      // → "yes please") land on a SECOND dead-end handler call with
      // pendingGuidanceReply false — that flag only ever looks at the
      // IMMEDIATELY PRECEDING turn's own text, and the turn right before
      // this one is the comparison-pick confirmation, not the original
      // guidance reply — so the "never re-suggest after a guidance-sourced
      // dead end" rule (see this flag's own call site) silently didn't
      // apply, and the buyer got a SECOND round of invented brand names for
      // the exact model they'd already picked, instead of an actual search
      // or an honest "still nothing." Scanning the whole request's history
      // for `isGuidanceReply` (not just the last turn) catches this hop and
      // every other one like it, the same way alreadyAskedBudgetThis-
      // Conversation just above already does for budget.
      const alreadyGaveGuidanceThisRequest =
        !startsFreshRequest &&
        history.some(
          (turn) => turn.role === "assistant" && turn.isGuidanceReply === true,
        );
      // The full alternative list from the most recent fresh comparison
      // THIS request ever ran, request-scoped like the two flags just
      // above — not just `history.at(-1)` (that's pendingComparisonPick's
      // job, for the IMMEDIATE confirmation reply only). Found live: after
      // a comparison pick dead-ended on Velte, "Can we check for the other
      // one" — an unambiguous reference to the only other option ever
      // named — got "which 'other one' do you mean?" instead of a direct
      // search, because the dead-end turn in between carries neither
      // awaitingComparisonPurchaseReply nor comparisonPickItem, so
      // pendingComparisonPick alone had already gone back to null by the
      // time this message arrived. Scanning the whole request's history
      // (same technique as alreadyGaveGuidanceThisRequest above) for the
      // most recent turn that still carries the full option list survives
      // any number of turns in between — a dead end, a clarifying answer,
      // anything — for as long as the request itself hasn't restarted.
      // Generic by construction: this is just "whatever was compared,"
      // never a specific category or item name.
      let rememberedComparisonOptions: string[] | null = null;
      if (!startsFreshRequest) {
        for (let i = history.length - 1; i >= 0; i -= 1) {
          const turn = history[i];
          if (
            turn.role === "assistant" &&
            Array.isArray(turn.comparisonOptions) &&
            turn.comparisonOptions.length > 0
          ) {
            rememberedComparisonOptions = turn.comparisonOptions;
            break;
          }
        }
      }
      if (
        // Every input below comes from the scope check's own reading of the
        // request (itemTerm/seekingKind/hasSpecificDetails), not from
        // counting tokens in the raw text: `itemTerm` is the clean noun
        // phrase to ask about (so a lead-in sentence is never quoted back
        // at the buyer), and `hasSpecificDetails` is the model's
        // judgment — with full conversation context — of whether anything
        // distinguishing, budget included, has been said yet.
        itemTerm &&
        !hasSpecificDetails &&
        !imageUrl &&
        // A multi-need message must reach the dual-intent split downstream
        // — pausing one of the needs for a budget question would swallow
        // the other entirely.
        !hasMultipleIntents &&
        !alreadyAskedBudgetThisConversation &&
        // Found live (2026-09-05): "Between Infinix Hot 50i and Samsung
        // Galaxy, which one is better" — a genuine Compare-tool turn,
        // already confirmed real by toolAlignment.ts (or by classifyScope's
        // own isComparison when auto-detected) — still got asked a generic
        // budget/use-case
        // question here, because classifyScopeTool collapsed two named
        // models down to a bare itemTerm ("phone") with hasSpecificDetails
        // false. That's a real gap in classifyScopeTool's own judgment, but
        // the STRUCTURAL fix is here: a buyer who explicitly asked to
        // compare named things has, by definition, already given this turn
        // its specific detail — asking "what's your budget?" next
        // contradicts the very check that just confirmed the request. A
        // compare turn must never be second-guessed by this gate.
        !isCompareTurn
      ) {
        // Widened 2026-09-05, rewritten 2026-09-09 — see bareQueryGate.ts's
        // own top comment for the full reasoning. `dynamicQuestion` is null
        // on any failure/unusable output; either way composeBareQueryReply
        // collapses back to the exact plain budget-only question this gate
        // always asked, so a bad call here degrades to the known-good
        // 2026-09-04 behavior rather than breaking the turn.
        //
        // NOT the raw `message` on a continuation turn (2026-09-16, found
        // live: "MC for my wedding event" → location gate → "Shared my
        // location" → this gate asked "what kind of service are you
        // looking for with 'MC'?", a question that makes no sense for a
        // term that already names the whole service). bareQueryGate.ts's
        // model call has no access to `itemTerm`'s own surrounding
        // conversation — its only content is whatever string lands in
        // `message` — so a content-free continuation ("Shared my
        // location", a bare "yes") handed it literally nothing to reason
        // about "wedding" from, and it fell back to the vaguest possible
        // question. Same fix the dual-intent re-derivation above uses for
        // this exact shape: resolve back to the last SUBSTANTIVE user turn,
        // which still has the real request in it. A reply to the Shopping
        // Plan deadline ask ("in 3 weeks", "no rush") is the same shape
        // again — content-free relative to the item — so it gets the same
        // fallback (`isAnsweringDeadlineAsk`, computed above).
        const bareQueryMessage =
          isSharedLocationMessage(message) ||
          isAcknowledgementReply(message) ||
          isAnsweringDeadlineAsk
            ? (lastSubstantiveUserMessage(history) ?? message)
            : message;
        const dynamicQuestion = await buildBareQueryGate({
          itemTerm,
          seekingKind,
          message: bareQueryMessage,
        });
        const question = composeBareQueryReply(itemTerm, dynamicQuestion);
        await sendBareFinal(question, {
          kind: "text",
          question,
          skippable: true,
          // Defaults true on a failed/timed-out call (dynamicQuestion null)
          // — the conservative direction: the static fallback invites a
          // budget without demanding one (see composeBareQueryReply's own
          // comment), and treating that as "budget asked" only ever
          // prevents a redundant re-ask, never blocks a genuine one, since
          // this whole gate never fires again once any detail is given.
          budgetAsked: dynamicQuestion?.asksBudget ?? true,
        });
        return;
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
          // rememberedBudget — this sub-flow (the buyer-request agreement's
          // own no_match path) never runs a fresh searchProducts call of
          // its own this turn, so there's no model-supplied maxBudgetNaira
          // to prefer over it, unlike the main dead-end call site below.
          return await fetchExternalOffers({
            query: q,
            maxBudgetNaira: rememberedBudget ?? undefined,
          });
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
          // browser can do), so location/image/matchQuery all moved to
          // the frontend's own POST /api/buyer-requests.
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
          // Non-null only on the turn confirming a fresh comparison's pick
          // (Phase 2) — a fresh comparison itself never reaches this call at
          // all (see the short-circuit above), so isCompareTurn being true
          // here always means pendingComparisonPick is set.
          pendingComparisonPick,
          // Structural "don't ask about location again" fact — see
          // buildSystemPrompt's own comment on the bug this fixes. Reuses
          // the exact same computation the proactive gate above already
          // trusts, so the model is never left to re-derive from raw prose
          // a decision route.ts has already made deterministically.
          alreadyAskedLocationThisConversation,
          // See this variable's own comment above (computed before the
          // scope check) — tells this call to search EVERY guidance
          // suggestion the buyer just confirmed, not just one, and never to
          // weigh them against each other.
          pendingGuidanceReply,
          // The request-scoped remembered option list (see its own comment
          // above) — lets a LATER "the other one" resolve correctly even
          // after pendingComparisonPick itself has gone back to null.
          rememberedComparisonOptions,
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
        // `!isOfferDeclineReply` — a decline is handled by its own
        // deterministic short-circuit right below (isDecliningOffer), not
        // this one.
        const lastHistoryTurn = history.at(-1);

        // Deterministic short-circuit for a DECLINE of either reach-out
        // offer (2026-09-22, explicit request — a decline's reply "has to
        // follow the flow of the conversation," not read as though it was
        // never heard). Checked BEFORE isAnsweringOffer and
        // isAnsweringVendorSearchOffer below, both of which already
        // exclude a decline via `!isOfferDeclineReply` on the assumption
        // it would be handled elsewhere — this is that elsewhere.
        //
        // Previously there was no "elsewhere": a decline fell straight
        // through to the ordinary pipeline, which has no notion of "the
        // buyer just said no to something" — the model, still holding the
        // full conversation (including the original search and the offer)
        // in context, quietly re-ran the search on its own initiative and
        // surfaced a DIFFERENT, often weaker result (no location, a
        // "similar match" instead of the original direct one) right under
        // a message that had just declined the offer about the FIRST
        // result. That reads as Velte not having heard the decline at
        // all — a buyer who says "no thanks" expects the exchange to
        // close, not a second, unprompted pitch.
        //
        // Same structural guard as its agree-direction siblings: a buyer
        // who ignores the offer and asks for something else entirely
        // (`requestRelation !== "new"` fails, and no isContinuation) must
        // still fall through to the ordinary pipeline rather than being
        // swallowed here as a decline.
        const isDecliningOffer =
          lastHistoryTurn?.role === "assistant" &&
          (lastHistoryTurn.awaitingBuyerRequestReply === true ||
            lastHistoryTurn.awaitingVendorSearchOffer === true) &&
          isOfferDeclineReply(message) &&
          (Boolean(body?.isContinuation) || requestRelation !== "new");

        if (isDecliningOffer) {
          const declineReply = pickAvoiding(offerDeclinedPhrase(), []);
          await sendBareFinal(declineReply, null);
          return;
        }

        const isAnsweringOffer =
          lastHistoryTurn?.role === "assistant" &&
          lastHistoryTurn.awaitingBuyerRequestReply === true &&
          !isOfferDeclineReply(message) &&
          // Same class of leak the history reset above fixes: this treats
          // ANY non-decline as agreement, so a buyer who ignores the offer
          // and simply asks for something else ("where can I get a phone")
          // would be signed up for a reach-out about the PREVIOUS item.
          // Walking away from an offer is not agreeing to it. `requestRelation`
          // alone used to be the only guard here — but it comes from
          // classifyScopeTool, the SAME unreliable classifier this whole
          // short-circuit exists to route around (its own comment above cites
          // it measuring 55% on exactly this "answer" case). Found live
          // (2026-09-16, "MC for my wedding" flow): the buyer's own NAME —
          // "Achimalo chinedu", typed into the dedicated name-capture box
          // handleNameSubmit renders for exactly this step — got read as
          // `requestRelation: "new"` (nothing about a bare two-word string
          // structurally says "this is an answer" to a classifier with an
          // unrelated DJ search sitting earlier in the same history), which
          // skipped this ENTIRE short-circuit and fell into the ordinary
          // pipeline — which then dual-intent-split "DJ" and "Master of
          // Ceremony" as if the buyer had just asked for both again, instead
          // of creating the buyer request. `body?.isContinuation` is the
          // same purely STRUCTURAL fact `isStructuralContinuation` above
          // already trusts over the classifier — the client sets it
          // specifically (and only) when a message came from one of the
          // dedicated continuation surfaces (handleNameSubmit,
          // handleClarificationAnswer, a location share), never from the
          // ordinary composer — so it's exactly the fact that should win
          // here too. Deliberately still `||`, not a replacement: a buyer
          // who walks away via the ORDINARY composer (no isContinuation)
          // still needs the classifier's "new" read to fall through
          // correctly, which this preserves.
          (Boolean(body?.isContinuation) || requestRelation !== "new");

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
              instagramLeads: [],
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
              awaitingVendorSearchOffer: false,
              vendorSearchMatchQuery: null,
              recommendation: null,
              externalOffers: preCheckOffers,
              awaitingComparisonPurchaseReply: false,
              comparisonPickItem: null,
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
            instagramLeads: [],
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
            awaitingVendorSearchOffer: false,
            vendorSearchMatchQuery: null,
            recommendation: null,
            externalOffers: agreementOffers,
            awaitingComparisonPurchaseReply: false,
            comparisonPickItem: null,
          });
          return;
        }

        // Deterministic short-circuit for the OTHER offer (2026-09-15,
        // explicit request) — same "don't trust the model to reliably
        // recognize an agreement from plain history text alone" reasoning
        // as isAnsweringOffer just above, and the same reason it exists as
        // its own block rather than a toolNote fed into the ordinary
        // pipeline: the offer's own QUESTION TEXT is picked client-side
        // (SearchHome.tsx's own LOCAL_VENDOR_SEARCH_OFFER_QUESTIONS), so it
        // never appears in `content`/history at all — the model would have
        // nothing to recognize a "yes" as agreeing TO even if trusted to
        // try. `awaitingVendorSearchOffer` (mirrored from the offer turn's
        // own structured state, same as awaitingBuyerRequestReply) is the
        // only thing that knows this exchange happened.
        //
        // Simpler than the buyer-request agreement above on purpose: this
        // never collects a name or phone number, and creates nothing — it
        // just runs the real searchStores call the buyer just agreed to
        // and shows real vendor cards, so one direct, deterministic call is
        // the whole mechanism, no LLM round trip needed for the agreement
        // step itself.
        const isAnsweringVendorSearchOffer =
          lastHistoryTurn?.role === "assistant" &&
          lastHistoryTurn.awaitingVendorSearchOffer === true &&
          !isOfferDeclineReply(message) &&
          // `body?.isContinuation ||`, same fix as isAnsweringOffer's own
          // (found live 2026-09-17, on this exact button — "Yes, look for a
          // vendor" after a product dead end came back requestRelation:
          // "new" despite the vendorSearchOfferNote hint fed to the
          // classifier, so this short-circuit never fired and the reply
          // fell into the ordinary pipeline asking "what kind of vendor
          // service, what's your budget" — re-asking for a product term
          // that was already known from the immediately preceding turn).
          // `isAnsweringOffer` above already carries this exact reasoning
          // for the buyer-request offer; this offer's own agreement step
          // was missing the same structural override, relying entirely on
          // the SAME unreliable classifier the sibling short-circuit
          // already stopped trusting alone. `body?.isContinuation` is set
          // only by the dedicated continuation surfaces (renderOfferActions'
          // own button, via handleClarificationAnswer) — never the ordinary
          // composer — so it's exactly the fact that should win here too.
          // Still `||`, not a replacement: a buyer who walks away via the
          // ordinary composer (no isContinuation) still needs the
          // classifier's "new" read to fall through correctly.
          (Boolean(body?.isContinuation) || requestRelation !== "new");

        if (isAnsweringVendorSearchOffer) {
          const businessType =
            typeof lastHistoryTurn.vendorSearchMatchQuery === "string"
              ? lastHistoryTurn.vendorSearchMatchQuery.trim()
              : "";

          const storeResult = businessType
            ? await searchStoresCore(
                {
                  businessType,
                  // The product search this offer grew out of already
                  // gathered these (2026-09-17) — vendorSearchMatchQuery
                  // and storedGoal.itemTerm come from the SAME originating
                  // turn by construction, so there's no drift risk the way
                  // a request-boundary check (sheetApplies) elsewhere in
                  // this file has to guard against. Carries the buyer's own
                  // details straight into this store's WhatsApp handoff —
                  // see StoreResultCard's own comment on why.
                  attributes: storedGoal?.attributes,
                  maxBudgetNaira: storedGoal?.maxBudgetNaira ?? undefined,
                },
                {
                  buyerLocation: body?.buyerLocation,
                  push,
                  locationLabel,
                  // Nearby businesses ARE worth surfacing here even for a
                  // product-shaped term — the buyer explicitly asked for a
                  // vendor, not a listing, so this is the one case where a
                  // product search's own "no Places for a bare item" rule
                  // (allowsNearbyBusinesses) doesn't apply: they already
                  // named the thing, now they want who can provide it.
                  allowNearbyBusinesses: true,
                },
              )
            : { error: "location-not-found" as const, message: "" };

          // Kind-of-BUSINESS verification, same as every other store result
          // in this file (2026-09-16) — this short-circuit bypasses the
          // ordinary pipeline's own hoisted verification pass further down,
          // so it has to run its own, or a "generator" vendor search could
          // put an electronics shop's card in front of the buyer unchecked.
          const rawVendorStores =
            "results" in storeResult ? storeResult.results : [];
          const vendorStores = rawVendorStores.length
            ? (
                await verifyStoreMatches({
                  businessType,
                  stores: rawVendorStores,
                })
              ).kept
            : [];
          const vendorPlaces =
            "externalSuggestions" in storeResult
              ? (storeResult.externalSuggestions ?? [])
              : [];
          // The full vendor chain the offer promised (2026-09-16, explicit
          // request, re-ordered 2026-09-22 also explicit): Velte vendors
          // first, then INSTAGRAM, then Google Places only as Instagram's
          // OWN fallback — reversed from Places-then-Instagram because most
          // small Nigerian vendors this offer exists for (caterers, cake
          // bakers, tailors, event stylists) run off an Instagram page with
          // no separate business listing Places would ever index, so
          // Instagram is the higher-yield source for exactly the
          // "opted in for a real vendor" case this block handles — Places
          // stays as the fallback for whatever Instagram genuinely has
          // nothing on, not a co-equal second list shown alongside it.
          // Still only when Velte itself has no verified vendor: a real
          // Velte match is the answer, and the buyer never asked for an
          // off-Velte list alongside it.
          const vendorInstagramLeads =
            businessType &&
            vendorStores.length === 0 &&
            isInstagramLeadSearchEnabled()
              ? await searchInstagramBusinesses({
                  businessType,
                  location: locationLabel,
                }).catch((err) => {
                  console.error(
                    "[search] instagram lead search failed for vendor-search agreement:",
                    err,
                  );
                  return [] as InstagramLead[];
                })
              : [];
          // Places already came back bundled with the Velte store search
          // above (searchStoresCore fetches both in one backend call, so
          // there's no extra cost to having it in hand) — only SHOWN when
          // Instagram found nothing, per the fallback ordering above.
          const shownVendorPlaces =
            vendorInstagramLeads.length > 0 ? [] : vendorPlaces;
          const vendorReply = businessType
            ? vendorStores.length > 0
              ? "Here's who I found who might be able to help with that — take a look below."
              : vendorInstagramLeads.length > 0 || shownVendorPlaces.length > 0
                ? "No Velte vendor for that yet — but here are some businesses off Velte that might be able to help."
                : "Couldn't find a vendor for that on Velte, and nothing nearby came up either."
            : "Couldn't tell what to look for a vendor for — try describing what you need again.";

          await sendFinal({
            type: "final",
            reply: vendorReply,
            toolCalled: true,
            clarification: null,
            products: [],
            weakProducts: [],
            stores: vendorStores,
            furtherStores:
              "furtherResults" in storeResult ? storeResult.furtherResults : [],
            storesQuery: businessType || null,
            productStores: [],
            storeServices: [],
            productsMatchTier: null,
            storesMatchTier:
              "matchTier" in storeResult ? storeResult.matchTier : null,
            productsMatchQuality: undefined,
            storesMatchQuality:
              "matchQuality" in storeResult
                ? storeResult.matchQuality
                : undefined,
            externalStoreSuggestions: shownVendorPlaces,
            instagramLeads: vendorInstagramLeads,
            vendorProducts: [],
            vendorProductsStore: null,
            buyerRequestOffer: null,
            buyerRequestOffered: false,
            backgroundItems: [],
            dualIntentItemALabel: null,
            awaitingBuyerRequestReply: false,
            buyerRequestMatchQuery: null,
            awaitingVendorSearchOffer: false,
            vendorSearchMatchQuery: null,
            recommendation: null,
            externalOffers: [],
            awaitingComparisonPurchaseReply: false,
            comparisonPickItem: null,
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
            // askClarifyingQuestion removed ENTIRELY, not just told not to
            // ask, whenever pendingComparisonPick is set (2026-09-15, found
            // live) — same "remove the option, don't ask nicely" fix shape
            // as the location retry further down. The buyer just confirmed
            // (or pointed at a different option from) a comparison pick;
            // toolNote above already says "do not call askClarifyingQuestion
            // this turn," but a model that ignored that instruction anyway
            // ("Please check which one is available" got "do you mean X or
            // Y?" instead of a search) left the buyer one extra round-trip
            // from an answer they'd already given. Taking the tool off the
            // table removes the option to comply badly — a compliant model
            // was always going to search anyway, so this only ever
            // constrains the non-compliant case.
            //
            // The Buyer Request tools go too (2026-09-23, measured: 2 of 4
            // "yes" replies to "Want me to find land in Enugu on Velte?"
            // got "what's your name, so I can pass it on?" — the prompt's
            // standing "a plain yes → ask their name for createBuyerRequest"
            // rule winning over toolNote). That "yes" confirms a SEARCH; no
            // reach-out was ever offered.
            tools: pendingComparisonPick
              ? {
                  searchProducts: searchTools.searchProducts,
                  searchStores: searchTools.searchStores,
                  getVendorProducts: searchTools.getVendorProducts,
                }
              : {
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
            // A confirmed pick MUST search (2026-09-23, measured): with
            // the note above and the reach-out tools removed, 4 of 6 "yes"
            // replies to "Want me to find land in Enugu on Velte?" still
            // called no tool at all and wrote "what's your name, so I can
            // pass it on?" — after which the dead-end handler searched
            // online for the literal word "yes". Forced on step 0 only, so
            // the model still writes its reply once results are in.
            prepareStep: pendingComparisonPick
              ? ({ stepNumber }) =>
                  stepNumber === 0 ? { toolChoice: "required" } : {}
              : undefined,
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
        // WHY A LOCATION ASK CAN BE POINTLESS — one concept, one name, used
        // by both detectors below (2026-09-05).
        //
        // There are two independent reasons, and they used to live in
        // completely different places: "we already know where they are" was
        // checked here, while "this is a comparison" was a `!isCompareTurn`
        // clause repeated on the two DETERMINISTIC location gates further up.
        // That left a third path — the main model call volunteering
        // askClarifyingQuestion(location) of its own accord — covered by
        // neither, and that is exactly the path that leaked: a buyer asked
        // Toyota-vs-Lexus and was asked for their location anyway.
        //
        // Naming it once and routing both detectors through it means a THIRD
        // reason can never be added to one and forgotten in the other, and
        // any future path that produces a location ask is covered the moment
        // its outcome flows through here.
        const locationAskIsPointless =
          // Already known — asking again is asking for something we hold.
          Boolean(body?.buyerLocation) ||
          // A comparison is not a proximity question: "which of these should
          // I buy" has the same answer wherever the buyer is standing.
          isCompareTurn;

        const looksLikeLocationClarify =
          locationAskIsPointless &&
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
          locationAskIsPointless &&
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
          return {
            retryResult,
            retryOutcome: extractOutcome(retryResult),
          };
        }

        const needsLocationButDidntAsk =
          !body?.buyerLocation &&
          !alreadyAskedLocationThisConversation &&
          !outcome.productCall &&
          !outcome.storeCall &&
          !outcome.hasUsefulResults &&
          outcome.clarifyCandidate?.kind !== "location" &&
          !OFF_TOPIC_DECLINE_PATTERN.test(result.text ?? "") &&
          // Same exemption as the proactive gate above: a comparison is not
          // a proximity question, and asking here would split it across two
          // turns for nothing.
          !isCompareTurn;

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
          if (priorText && hasGenuineDualIntentPhrasing(priorText)) {
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
            instagramLeads: [],
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
            awaitingVendorSearchOffer: false,
            vendorSearchMatchQuery: null,
            recommendation: null,
            externalOffers: [],
            awaitingComparisonPurchaseReply: false,
            comparisonPickItem: null,
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
        // True once suggestBuyingGuidance actually supplies replyOverride
        // (2026-09-15, explicit request) — real-world suggestions on a
        // genuine dead end, general knowledge rather than a confirmed Velte
        // result, and the buyer-facing UI needs to be able to tell that
        // apart from an ordinary reply. Carried on the final event so
        // SearchHome.tsx can render a distinguishing caption instead of
        // leaving guidance to look identical to any other plain-text turn
        // (or, worse, to a genuine empty dead end with no suggestions at
        // all — same CompassIcon treatment today).
        let usedGuidanceReply = false;
        // Populated only by the "similar store match" branch further down,
        // BEFORE the ordinary nothingOnVelte-gated external-offer block
        // (which won't fire for this case — see that branch's own comment
        // on why it fetches its own, self-contained copy rather than
        // relying on the shared one). Read back into `externalOffers`
        // itself the moment that `let` is declared below, so every later
        // reference to `externalOffers` in this function sees it exactly
        // as if the shared block had produced it.
        let earlyExternalOffers: ExternalOffer[] = [];
        // Set only when THIS file authored a "nothing anywhere" dead-end
        // line. The external connectors run much later (they're the last
        // thing tried), so the line is chosen before anyone knows whether
        // there are online offers to show — this remembers the term so it
        // can be re-phrased once that's known, rather than leaving "and
        // nothing close by either" sitting on top of six live listings. A
        // model-authored reply is never touched: it had the turn's real
        // context and this doesn't.
        let deadEndTerm: string | null = null;
        // Whether deadEndTerm actually names an ITEM/SERVICE the buyer
        // wants (a product term, or several compared options) rather than
        // just a business/vendor TYPE they're looking for (storeTerm with
        // no product alongside it — a searchStores-only turn). Read below,
        // right before suggestBuyingGuidance is called: that tool's whole
        // framing is "suggest a real product/brand/model" or "suggest a
        // real specialisation to look for" — neither makes sense for an
        // input like "Apple store", which is already a VENDOR CATEGORY, not
        // a thing to buy or a task to hire out. Found live: a buyer's
        // follow-up got resolved into a bare searchStores("Apple store")
        // with no product named, dead-ended, and the guidance call — forced
        // to treat "Apple store" as if it were a product to shop for —
        // produced nonsense like "Apple Store App" and "Apple Authorized
        // Resellers", neither a real, single, checkable suggestion the
        // buyer could act on the way "Samsung Galaxy A54" is.
        let deadEndHasNamedItem = false;
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
          // Kind-of-BUSINESS verification BEFORE the offer, via the one
          // canonical gate (2026-09-15 — see findReachOutEligibleVendors'
          // own header for why this is never hand-rolled per branch
          // anymore). The cascade's stores were found by sector similarity
          // to the model's own paraphrased businessType, and for a category
          // Velte simply doesn't have, the nearest sector is still returned.
          const { eligible: canContact, kept: cascadeKept } =
            await findReachOutEligibleVendors(
              cascadeTerm,
              outcome.stores,
              body?.buyerLocation,
              matchQuery,
            );
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
                cascadeKept[0],
              ),
              [],
            );
          }
        }

        // A "similar" (not exact) product match, offered ALONGSIDE a real
        // reach-out option (2026-09-14, explicit request; folded into the
        // "found on Velte, stop" waterfall on 2026-09-15, then RESTORED the
        // same day, scoped to this exact case only — see that request's own
        // wording: a product already showing on Velte, even weakly, is a
        // genuinely different moment from a true dead end, and this is the
        // one deliberate exception to the otherwise-strict waterfall) —
        // never REPLACING the cards below, which still show exactly as they
        // would without this. Deliberately narrower than the cascade above:
        // this fires on a genuinely non-empty result, so it's mutually
        // exclusive with every dead-end/cascade branch here (all gated on
        // products/stores both empty) — cannot double-fire or contradict
        // them.
        //
        // Scoped to "similar" only, never "direct" — an exact match is a
        // confident answer; asking "want me to also check locally?" right
        // under it would read as Velte doubting its own result.
        //
        // Deliberately NOT the canonical findReachOutEligibleVendors gate
        // used everywhere else in this file (see that function's own
        // header) — its contactability half (hasContactableVendorsForQuery)
        // ORs a product hit with a store hit, and the product half is
        // ALREADY guaranteed true by the time this block runs (that's what
        // got it reached at all), which would make the whole check a no-op
        // that always passes. What's actually being asked here is narrower:
        // does a real, STANDALONE Velte store exist for this category, not
        // "was something found" (it was — that's not the question).
        // `allowNearbyBusinesses: false` covers the other half of that same
        // gate on its own — only a real Velte vendor counts, never a Google
        // Places result standing in for one.
        if (
          !outcome.clarification &&
          !outcome.buyerRequestOffered &&
          outcome.products.length > 0 &&
          outcome.productsMatchQuality === "similar" &&
          outcome.productCall &&
          !isAcknowledgementReply(message)
        ) {
          const similarProductInput = outcome.productCall.input as {
            product?: string;
            attributes?: string[];
          };
          const similarTerm = similarProductInput.product
            ? buildProductTerm(
                similarProductInput.product,
                similarProductInput.attributes,
              )
            : null;
          if (similarTerm) {
            const storeCheck = await searchStoresCore(
              { businessType: similarTerm },
              {
                buyerLocation: body?.buyerLocation,
                allowNearbyBusinesses: false,
              },
            );
            const similarStoreVerification =
              "results" in storeCheck
                ? await verifyStoreMatches({
                    businessType: similarTerm,
                    stores: storeCheck.results,
                  })
                : null;
            if (similarStoreVerification?.rejected.length) {
              console.info(
                `[search] dropped ${similarStoreVerification.rejected.length} wrong-kind vendor(s) from the similar-match reach-out check for "${similarTerm}":`,
                similarStoreVerification.rejected.map(
                  (r) => `${r.match.name} → ${r.actualBusiness}`,
                ),
              );
            }
            const hasRelatedStore =
              (similarStoreVerification?.kept.length ?? 0) > 0;
            if (hasRelatedStore) {
              buyerRequestMatchQuery = similarTerm;
              replyOverride = pickAvoiding(
                similarMatchReachOutPhrase(
                  similarTerm,
                  looksLikeServiceTask(similarTerm),
                ),
                [],
              );
              outcome = { ...outcome, buyerRequestOffered: true };
            }
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
              // Varies by matchQuality (2026-09-15, found live) — a plain
              // "Found a real match" read as full confidence sitting right
              // above a card section the frontend itself labels "Similar",
              // whenever the fallback's own match was near-floor rather
              // than a real hit. Mirrors how the system prompt already
              // tells the MODEL to phrase this exact distinction elsewhere
              // ("Found an exact match!" vs "Nothing identical, but here's
              // something similar nearby.") — this is the same honesty
              // rule, just for a code-authored reply instead of a
              // model-authored one.
              replyOverride =
                fallback.matchQuality === "similar"
                  ? "Nothing exact on Velte, but here's something similar — take a look below."
                  : "Found a real match on Velte for that — take a look below.";
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
            // Kind-of-BUSINESS verification AND real-Velte-vendor
            // confirmation, via the one canonical gate (2026-09-15 — see
            // findReachOutEligibleVendors' own header). This branch's
            // searchStoresCore call above runs with the session's ordinary
            // `allowNearbyBusinesses`, so `fallback.results` can itself
            // include a Google Places entry standing in for a real Velte
            // vendor — verifying "kind" alone (as this used to) would
            // happily pass a right-KIND Places result through as if it were
            // a real, contactable Velte store. The shared gate's own
            // hasContactableVendorsForQuery half is what actually rules
            // that out, same as every other branch that can trigger this
            // offer.
            const asymmetricEligibility =
              "results" in fallback && fallback.results.length
                ? await findReachOutEligibleVendors(
                    businessType,
                    fallback.results,
                    body?.buyerLocation,
                  )
                : { eligible: false, kept: [] };
            // Zero real results — whether or not Places turned up
            // something, or everything got rejected above as the wrong kind
            // of business or not a genuine Velte vendor — falls through
            // unchanged into the unified dead-end handler below, same as
            // the ordinary double-empty case: no special-casing here
            // anymore (see that block's own comment for why — this used to
            // leak Google Places without ever offering a reach-out, a bug
            // logged as "Issue A").
            if ("results" in fallback && asymmetricEligibility.eligible) {
              // ANY verified category match routes to the Buyer-Request
              // offer now, "direct" matchQuality included (2026-09-15,
              // explicit rule: a Velte store whose sector the product
              // belongs to means THAT vendor gets contacted via Buyer
              // Request — full stop, no carve-out for a confident sector
              // match). A "direct" store hit used to bypass the offer and
              // show the store card itself, which put a Message button
              // under a STORE PROFILE that never claimed to carry this
              // specific product — the same over-trust every other branch
              // in this file was fixed for today, just gated on
              // matchQuality here instead of skipped outright.
              //
              // Fetches its OWN external offers here, self-contained,
              // rather than relying on the shared nothingOnVelte block
              // further down — that block requires `!buyerRequestOffered`
              // (external offers wait for a decline on a GENUINE dead end,
              // the "Buyer Requests come first" rule), and this case
              // deliberately reverses that ordering: a sector-tag match
              // doesn't deserve the same "wait for Velte first" priority a
              // real dead end gets, since there is nothing confirmed to
              // wait for — so external listings show immediately, with the
              // local-vendor route offered alongside them rather than
              // gating them.
              buyerRequestMatchQuery = businessType;
              const isServiceQuery = allowsNearbyBusinesses(
                businessType,
                allowNearbyBusinesses,
              );
              if (!isServiceQuery && hasExternalConnectors()) {
                const budget =
                  usableBudget(
                    (
                      outcome.productCall?.input as
                        | { maxBudgetNaira?: number }
                        | undefined
                    )?.maxBudgetNaira,
                  ) ?? usableBudget(rememberedBudget);
                push(checkingElsewherePhrase(businessType));
                const offers = await fetchExternalOffers({
                  query: businessType,
                  maxBudgetNaira: budget,
                  location: productInput.location,
                }).catch((err) => {
                  console.error(
                    "[search] external offers failed for asymmetric store fallback:",
                    err,
                  );
                  return [] as ExternalOffer[];
                });
                if (offers.length) {
                  const verified = await verifyOfferMatches({
                    query: businessType,
                    offers,
                    referenceImageUrl: imageUrl,
                  });
                  earlyExternalOffers = verified.kept;
                }
              }
              replyOverride = pickAvoiding(
                earlyExternalOffers.length
                  ? externalOffersWithLocalOfferPhrase(
                      businessType,
                      isServiceQuery,
                    )
                  : foundPossibleVendorPhrase(
                      businessType,
                      isServiceQuery,
                      asymmetricEligibility.kept[0],
                    ),
                [],
              );
              outcome = {
                ...outcome,
                stores: [],
                furtherStores: [],
                storesMatchTier: null,
                storesMatchQuality: undefined,
                storesQuery: null,
                clarification: null,
                buyerRequestOffered: true,
              };
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
                // Found live: this used to pass the model's RAW attributes
                // straight through, unlike searchProductsCore's own use of
                // buildProductTerm (which filters through usableAttributes
                // first) — so a narrating non-attribute the model produced
                // ("no location — searching nationwide"-shaped junk) landed
                // straight in the buyer-visible dead-end term instead of
                // being dropped before it ever got there.
                usableAttributes(deadEndProductInput.attributes),
              )
            : null;
          // cleanBusinessType, not the raw field, for the same reason
          // buildProductTerm above already strips the product side — found
          // live: "DJ services one day"/"DJ services wedding full-day"
          // reached this buyer-facing dead-end line verbatim. The earlier
          // in-place cleanup on `storeCall.input` (right after storeCall is
          // first extracted) only covers the FIRST model call this turn —
          // a location retry or a later cross-check can re-derive
          // `outcome.storeCall` from a fresh, uncleaned tool call, so this
          // read needs its own guard rather than trusting that one upstream
          // mutation to have already covered it.
          const storeTerm = deadEndStoreInput?.businessType
            ? cleanBusinessType(deadEndStoreInput.businessType)
            : null;
          // Name EVERY product this turn actually searched for, not just
          // whichever call happened to run last (2026-09-05, found live on
          // a compare turn; generalized 2026-09-15, found live on a plain
          // multi-item turn too). A buyer who asked "Toyota 2026 or Lexus
          // Jeep 2026, which should I buy" and is told only that the Lexus
          // wasn't found is left wondering what happened to the Toyota; the
          // same gap showed up confirming "both" of a guidance reply's own
          // two suggestions — the dead-end reply named only whichever
          // battery the model happened to search LAST, as if the other one
          // was never asked about at all. Computed regardless of
          // isCompareTurn now, since both shapes call searchProducts more
          // than once this turn and both need every one of those named.
          //
          // The JOINER is what actually differs between the two shapes:
          // "or" for a real comparison (these are ALTERNATIVES — the buyer
          // was only ever going to buy one), "and" otherwise (these are
          // separate things the buyer wants ALL of — "both", a dual-intent
          // pair — so "X or Y" would misreport a mutual-exclusivity that
          // was never true).
          const allProductTerms = Array.from(
            new Set(
              outcome.productCalls
                .map((call) => {
                  const input = call.input as
                    | { product?: string; attributes?: string[] }
                    | undefined;
                  return input?.product
                    ? buildProductTerm(
                        input.product,
                        usableAttributes(input.attributes),
                      )
                    : null;
                })
                .filter((term): term is string => Boolean(term)),
            ),
          );
          const scanTerm =
            allProductTerms.length > 1
              ? allProductTerms.join(isCompareTurn ? " or " : " and ")
              : (productTerm ?? storeTerm ?? "that");
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

          // Kind-of-BUSINESS verification AND real-Velte-vendor
          // confirmation on the cross-check's own store hits, via the one
          // canonical gate (2026-09-15 — see findReachOutEligibleVendors'
          // own header; found live: "car battery Toyota Camry 2012"
          // produced "A real business turned up that might carry that —
          // want me to reach out?" on a catalogue with no automotive vendor
          // at all). The store scan above searches STORES by the product's
          // name, and — like every store search — comes back with whatever
          // is semantically nearest, which for a term nothing genuinely
          // matches is just the least-wrong neighbour (an electronics or
          // phone-accessories shop for "battery", say). If nothing
          // survives, there is no possible vendor and the turn falls
          // through to the plain dead end (and guidance) below, exactly as
          // if the scan had found nothing.
          const storeScanEligibility = storeScanResult?.results.length
            ? await findReachOutEligibleVendors(
                scanTerm,
                storeScanResult.results,
                body?.buyerLocation,
              )
            : { eligible: false, kept: [] };

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
          } else if (storeScanEligibility.eligible) {
            outcome = { ...outcome, buyerRequestOffered: true };
            buyerRequestMatchQuery = scanTerm;
            // Same external-offer check the asymmetric productCall-only
            // fallback above already does before making its own reach-out
            // offer (2026-09-22, explicit fix — found live: "laptop for
            // programming" landed HERE, not there, purely because the
            // model had already tried both searchProducts AND searchStores
            // on its own this turn — the more thorough search behavior —
            // and reached the buyer with only a vendor offer, no "here's
            // where else you can buy it" even though Jiji/Google Shopping
            // were never actually asked. Two separate code paths can both
            // end in "offer to reach out to a vendor," and only one of
            // them had this step; this is the other one getting it too, so
            // which path you land on no longer changes what gets checked.
            // Skipped for a service term (nobody buys a service off Jiji)
            // and gated on hasExternalConnectors(), same as the sibling.
            const isServiceQuery = looksLikeServiceTask(scanTerm);
            if (!isServiceQuery && hasExternalConnectors()) {
              push(checkingElsewherePhrase(scanTerm));
              const offers = await fetchExternalOffers({
                query: scanTerm,
                maxBudgetNaira: usableBudget(rememberedBudget),
                location: scanLocation,
              }).catch((err) => {
                console.error(
                  "[search] external offers failed for sector-match fallback:",
                  err,
                );
                return [] as ExternalOffer[];
              });
              if (offers.length) {
                const verified = await verifyOfferMatches({
                  query: scanTerm,
                  offers,
                  referenceImageUrl: imageUrl,
                });
                earlyExternalOffers = verified.kept;
              }
            }
            replyOverride = pickAvoiding(
              earlyExternalOffers.length
                ? externalOffersWithLocalOfferPhrase(scanTerm, isServiceQuery)
                : foundPossibleVendorPhrase(
                    scanTerm,
                    isServiceQuery,
                    storeScanEligibility.kept[0],
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
            // Instagram business leads (2026-09-15, explicit request) — a
            // THIRD fallback tier, after Velte itself and Google Places,
            // scoped to a genuine VENDOR/STORE dead end specifically —
            // never fired for a bare product dead end — that side already
            // has its own external-offer connector, which deliberately
            // excludes Instagram entirely, see serper.ts's own
            // NOT_A_SHOP). Many small Nigerian vendors (caterers, tailors,
            // event stylists) run entirely off an Instagram page with no
            // website and no Google Places listing, so this can find a
            // real, contactable business exactly where Places comes up
            // just as empty as Velte did. Location is the buyer's own
            // named place (`scanLocation`), never guessed — omitted from
            // the search entirely when none was given, same rule every
            // other location field in this file follows.
            //
            // GATED ON `!productTerm`, not just `storeTerm` (2026-09-15,
            // found live: "a small chest freezer" — a plain PRODUCT
            // request — surfaced two random Instagram appliance pages,
            // because searchProducts' own mandatory zero-result cascade
            // (systemPrompt.ts's own rule) always tries searchStores too,
            // which sets `storeTerm` even on a turn the buyer never asked
            // about a KIND OF BUSINESS for at all). `storeTerm` alone only
            // proves a searchStores call happened THIS turn, not that it
            // was the buyer's own actual intent — `productTerm` is what
            // tells the two apart, same distinction deadEndHasNamedItem
            // already draws for suggestBuyingGuidance right above this
            // block, for the identical reason ("Apple store" out of a
            // MacBook search).
            const instagramLeads =
              !productTerm && storeTerm && isInstagramLeadSearchEnabled()
                ? await searchInstagramBusinesses({
                    businessType: storeTerm,
                    location: scanLocation,
                  })
                : [];
            outcome = {
              ...outcome,
              externalStoreSuggestions: mergedExternal,
              instagramLeads,
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
                mergedExternal.length > 0 || instagramLeads.length > 0,
                looksLikeServiceTask(scanTerm),
              ),
              [],
            );
            deadEndTerm = scanTerm;
            deadEndHasNamedItem =
              Boolean(productTerm) || allProductTerms.length > 1;
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
          Boolean(outcome.productCall || outcome.storeCall) &&
          // See the proactive gate's own comment — a compare turn never
          // detours through a location ask.
          !isCompareTurn;

        if (searchedNationwideWithoutAsking) {
          console.warn(
            "[search] still nothing after the dead-end cross-check, with no location signal — retrying with a location-only system prompt",
          );
          ({ retryResult: result, retryOutcome: outcome } =
            await retryLocationOnly());
          replyOverride = null;
          deadEndTerm = null;
          deadEndHasNamedItem = false;
        }

        // ═══ THE COMPARISON FLOW GUARANTEE (2026-09-05) ═══════════════
        //
        // Every compare turn passes through here before anything reads its
        // outcome. It exists because four separate bugs had the SAME shape:
        // a turn correctly identified as a comparison quietly fell into a
        // non-comparison path, and nothing noticed.
        //
        //   1. The location gate asked where the buyer was, splitting the
        //      comparison across two turns and losing it on the second.
        //   2. The dual-intent split treated two alternatives as two
        //      separate needs and answered only one.
        //   3. The external fallback fetched listings for one option, so
        //      there was never enough to compare.
        //   4. The reply called it a dead end while a comparison rendered
        //      underneath it.
        //
        // Each was fixed where it happened. That is exactly what does not
        // scale — a fifth exit will be added by someone who has not read any
        // of those fixes. So the guarantee moved HERE, to the one place every
        // compare turn already passes, and is stated as invariants over the
        // finished outcome rather than as a rule each path has to remember.
        //
        // It REPAIRS rather than refuses, and every repair is logged. A
        // silent repair would just be the original bug with extra steps: the
        // log is what makes drift visible, and a repair firing routinely is
        // the signal to go and fix the path that keeps needing it.
        if (isCompareTurn) {
          // ── Invariant 1: a comparison never ends on a question ─────────
          //
          // systemPrompt's compare rule forbids askClarifyingQuestion
          // outright, so anything here is the model not complying. Dropped
          // for ANY kind, not just location: a budget or use-case question
          // contradicts a comparison just as squarely — the buyer named what
          // to weigh, and naming it IS the detail this turn needed.
          //
          // Safe to drop because a comparison always has somewhere to go
          // without it: real results if the searches found any, and the
          // dead-end/external path if they didn't.
          if (outcome.clarification || outcome.clarifyCandidate) {
            console.warn(
              `[compare] dropped a ${
                outcome.clarifyCandidate?.kind ?? "unknown"
              } clarification on a comparison turn — the options were already named`,
            );
            outcome = {
              ...outcome,
              clarification: null,
              clarifyCandidate: null,
            };
          }

          // ── Invariant 2: every named option actually got searched ──────
          //
          // The one that needs real work, and the reason comparisonOptions
          // exists as data. The model is TOLD to search each option
          // separately; when it doesn't, this runs the missing search itself
          // via searchProductsCore/searchStoresCore — the exact same
          // functions the tool calls would have reached, so a backfilled
          // option is indistinguishable from one the model searched.
          const searchedTerms = outcome.productCalls
            .map(
              (call) =>
                (call.input as { product?: string } | undefined)?.product ?? "",
            )
            .filter(Boolean);
          // The STORE half (2026-09-05) — added after checking whether a
          // SERVICE comparison ("a wedding photographer vs an event
          // planner") had the same guarantee a PRODUCT comparison already
          // did. It didn't: this whole invariant only ever inspected
          // productCalls, so a service comparison where the model searched
          // just one of two named business types had nothing to notice or
          // repair — a whole side of the comparison could go missing with
          // no error and no log line.
          const searchedBusinessTypes = outcome.storeCalls
            .map(
              (call) =>
                (call.input as { businessType?: string } | undefined)
                  ?.businessType ?? "",
            )
            .filter(Boolean);
          // An option only counts as missing if NEITHER kind of search
          // covered it — a comparison can legitimately mix a named product
          // with a kind of business in one ask ("a wedding photographer or
          // just buy a good camera"), so checking only one list would
          // wrongly flag the half that was correctly searched as the other
          // kind.
          const missing = comparisonOptions.filter(
            (option) =>
              !optionWasSearched(option, searchedTerms) &&
              !optionWasSearched(option, searchedBusinessTypes),
          );

          if (missing.length && comparisonOptions.length > 1) {
            // Which kind of search to backfill a missing option AS. Mirrors
            // whichever kind the turn's OWN searches already used: if the
            // model searched stores and no products at all, this is a
            // service comparison and a missing option almost certainly
            // wanted searchStores too. Defaults to the product path
            // otherwise — the original, tested behaviour, and the safe
            // default when neither kind of call exists yet to take a cue
            // from.
            const backfillAsStore =
              outcome.storeCalls.length > 0 &&
              outcome.productCalls.length === 0;
            console.warn(
              `[compare] ${missing.length} of ${comparisonOptions.length} option(s) never searched by the model — backfilling as ${backfillAsStore ? "stores" : "products"}: ${missing.join(", ")}`,
            );
            if (backfillAsStore) {
              const backfilled = await Promise.all(
                missing.map((option) =>
                  searchStoresCore(
                    { businessType: option },
                    {
                      buyerLocation: body?.buyerLocation,
                      push,
                      locationLabel,
                      allowNearbyBusinesses,
                    },
                  ).catch((err) => {
                    console.error(
                      `[compare] store backfill search failed for "${option}":`,
                      err,
                    );
                    return null;
                  }),
                ),
              );
              const extra = backfilled.flatMap((r) =>
                r && "results" in r ? r.results : [],
              );
              if (extra.length) {
                // Deduped by storeId — the same vendor answering two named
                // business types is rare but not impossible (a general
                // contractor covering both "plumber" and "electrician").
                outcome = {
                  ...outcome,
                  stores: Array.from(
                    new Map(
                      [...outcome.stores, ...extra].map((s) => [s.storeId, s]),
                    ).values(),
                  ),
                };
              }
            } else {
              const backfilled = await Promise.all(
                missing.map((option) =>
                  searchProductsCore(
                    { product: option },
                    {
                      buyerLocation: body?.buyerLocation,
                      push,
                      locationLabel,
                      allowNearbyBusinesses,
                    },
                  ).catch((err) => {
                    // One option failing must not cost the others: a
                    // comparison missing one side still beats no comparison.
                    console.error(
                      `[compare] backfill search failed for "${option}":`,
                      err,
                    );
                    return null;
                  }),
                ),
              );
              const extra = backfilled.flatMap((r) =>
                r && "results" in r ? r.results : [],
              );
              if (extra.length) {
                // Deduped by productId — a listing that answers both options
                // (rare, but a multi-brand dealer does it) must not appear
                // twice in the table.
                outcome = {
                  ...outcome,
                  products: Array.from(
                    new Map(
                      [...outcome.products, ...extra].map((m) => [
                        m.productId,
                        m,
                      ]),
                    ).values(),
                  ),
                };
              }
            }
          }
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
          instagramLeads,
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
        //
        // Seeded from earlyExternalOffers, not always `[]` — the "similar
        // store match" branch above fetches its own, self-contained set
        // for exactly the one case where external offers show WITHOUT
        // waiting on nothingOnVelte below (see that branch's own comment).
        // nothingOnVelte itself will be false whenever that branch fired
        // (it sets buyerRequestOffered), so the block below never
        // double-fetches on top of this.
        let externalOffers: ExternalOffer[] = earlyExternalOffers;
        // Hoisted out of the block below (rather than staying a block-local
        // const) so the budget-honesty check further down — after
        // fetchExternalOffers has actually run — can still read what ceiling
        // was in play this turn.
        let effectiveBudget: number | undefined;
        const nothingOnVelte =
          !clarification &&
          products.length === 0 &&
          stores.length === 0 &&
          vendorProducts.length === 0 &&
          !buyerRequestOffered;
        if (nothingOnVelte && hasExternalConnectors()) {
          const productInput = productCall?.input as
            | {
                product?: string;
                attributes?: string[];
                maxBudgetNaira?: number;
                location?: string;
              }
            | undefined;
          const storeInput = storeCall?.input as
            | { businessType?: string; location?: string }
            | undefined;
          // The buyer's own named place, if either tool call carried one
          // this turn (2026-09-22, found live: a buyer who named "Anambra"
          // directly got land listings back from Ibadan, Ikorodu and Abuja
          // — this was extracted for Velte's own search and then never
          // reached the external fallback at all). Never a device
          // coordinate — see ExternalConnector.search's own comment on why
          // only a NAME the buyer actually said is ever passed along.
          const externalLocation =
            productInput?.location ?? storeInput?.location ?? undefined;
          // Was bare `productInput?.product` — found live: a "good camera,
          // high storage" phone request, genuinely empty on Velte, fell
          // back to a Serper search and a wrong-kind-of-item check both run
          // against the word "phone" ALONE, nothing else the buyer actually
          // asked for. Both the fetch and verifyOfferMatches below only
          // ever see this one term — searching just "phone" surfaced (and
          // then correctly-but-uselessly PASSED verification for) a ₦10,000
          // button phone, since it genuinely is a phone; "good camera" and
          // "high storage" were never part of the question either step was
          // asked. The buyer-facing dead-end line already builds its own
          // term with buildProductTerm the same way — this was the one
          // place still working off a bare product name instead.
          const externalQuery = productInput?.product
            ? buildProductTerm(
                productInput.product,
                usableAttributes(productInput.attributes),
              )
            : (storeInput?.businessType ?? message);

          // ON A COMPARE TURN, FETCH LISTINGS FOR EVERY OPTION (2026-09-05).
          //
          // `externalQuery` above reads ONE product call, so a comparison
          // that found nothing on Velte was falling back to online listings
          // for only one of the things being compared — and then couldn't
          // compare, because the external comparison needs at least two
          // offers to weigh (see the `externalOffers.length >= 2` branch
          // below). Found live: "Toyota 2026 or Lexus Jeep 2026, which should
          // I buy" came back with a single Lexus listing and no comparison at
          // all, which is not an answer to the question that was asked.
          //
          // Velte having no cars does not make the question unanswerable. The
          // buyer asked which to buy; real listings for both, weighed against
          // each other, IS the answer — and it is still built entirely from
          // fetched data, never invented, exactly as the Velte-side
          // comparison is.
          // The SAME option list the guarantee above enforces, not a second
          // one re-derived from tool calls. Two derivations of "what is being
          // compared" is how the Velte search and the online fallback end up
          // comparing different things — and the tool-call derivation is the
          // weaker of the two, since it only sees what the model chose to do.
          const compareQueries = isCompareTurn ? comparisonOptions : [];
          // Same precedence route.ts already uses when writing the goal
          // sheet (see goalUpdate below): the model's own fresh tool-call
          // budget wins when this turn actually named one, falling back to
          // whatever's remembered from an earlier turn on the same request.
          // searchStoresTool has no budget field of its own — a store
          // search picks a business, not a priced item — so only the
          // product call ever supplies one here.
          // usableBudget, not a raw read: the model has been seen sending
          // maxBudgetNaira 0 on a query with no budget in it, and a zero
          // ceiling here would hard-drop every PRICED listing from the
          // external fallback, leaving only the unpriced junk. See
          // usableBudget's own comment.
          effectiveBudget =
            usableBudget(productInput?.maxBudgetNaira) ??
            usableBudget(rememberedBudget);
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
            if (compareQueries.length > 1) {
              // One fetch per option, in parallel — they are independent
              // lookups and running them in series would double the wait on
              // the turn that already did the most work.
              const perOption = await Promise.all(
                compareQueries.map(async (query) => {
                  const offers = await fetchExternalOffers({
                    query,
                    maxBudgetNaira: effectiveBudget,
                    location: externalLocation,
                  }).catch((err) => {
                    // One option failing must not lose the other's listings:
                    // a comparison with one side missing is still worth more
                    // than a dead end with neither.
                    console.error(
                      `[search] external offers failed for "${query}":`,
                      err,
                    );
                    return [] as ExternalOffer[];
                  });

                  // Verified AGAINST ITS OWN QUERY, per option, not skipped
                  // (2026-09-05, found live: an "iPhone 17 Pro Max vs
                  // Samsung Galaxy S30 Ultra" comparison sat a phone CASE
                  // and two protective covers straight into the table
                  // alongside real phones — "Samsung Galaxy S30 Ultra
                  // Silicone", "Protective Transparent Case" — with nothing
                  // catching them). Kind-of-item verification used to be
                  // skipped ENTIRELY on any multi-option turn, on the
                  // reasoning that checking option A's listings against
                  // option B's query would wrongly reject A's own real
                  // results. That reasoning was right about the CROSS-
                  // option case and wrong about the fix: checking each
                  // option's OWN listings against its OWN query has no such
                  // problem, and this is exactly the shape that already
                  // exists for single-item searches — verifyOfferMatches
                  // was simply never being called here at all. A case
                  // "for" a phone matches the phone's own search words as
                  // readily as the phone does (a shop's SEO title bundles
                  // both in), which is precisely the class of error this
                  // gate exists to catch — accessories are not a
                  // vehicle-only problem, or a phone-only one.
                  if (!offers.length) return offers;
                  push(checkingPhotosPhrase(query));
                  // No referenceImageUrl here, deliberately — this branch
                  // compares MULTIPLE different named options (a compare
                  // turn), each against its OWN offers; the buyer's one
                  // photo (if any) can't stand in as "what you want" for
                  // every option at once the way it can for a single-item
                  // photo search below.
                  const verified = await verifyOfferMatches({
                    query,
                    offers,
                  });
                  if (verified.rejected.length) {
                    console.info(
                      `[search] dropped ${verified.rejected.length} wrong-kind external offer(s) for "${query}":`,
                      verified.rejected.map(
                        (r) => `${r.offer.title} → ${r.actualItem}`,
                      ),
                    );
                  }
                  return verified.kept;
                }),
              );
              // Deduped by url — the same listing can legitimately answer
              // both queries (a dealer page listing several makes), and one
              // row appearing twice in a comparison reads as a bug.
              externalOffers = Array.from(
                new Map(
                  perOption.flat().map((offer) => [offer.url, offer]),
                ).values(),
              );
            } else {
              externalOffers = await fetchExternalOffers({
                query: externalQuery,
                maxBudgetNaira: effectiveBudget,
                location: externalLocation,
              });
            }
            // The same kind-of-item gate searchProductsCore runs on Velte's
            // own results (verifyMatches.ts), applied to the fallback list.
            // Google Shopping answers "corporate shoe" with sneakers just
            // as readily as a vector index does — and a shop's SEO title is
            // weaker evidence than a vendor's own listing, so the photo is
            // doing most of the work here. Emptying the list is a
            // legitimate outcome: everything below already treats "no
            // offers" as the ordinary case, so all six being the wrong
            // product simply reads as the connector having found nothing.
            // Guarded to `compareQueries.length <= 1` NOT to skip
            // verification on a multi-option turn (2026-09-05: it no longer
            // does — see the per-option verification a few lines up, inside
            // the `compareQueries.length > 1` branch, which checks each
            // option's own listings against its own query instead of
            // skipping the check entirely). This guard exists only so a
            // multi-option turn's ALREADY-verified `externalOffers` isn't
            // run through a SECOND verification pass here against one
            // merged `externalQuery` — which is exactly the query mismatch
            // (option A's listings judged against option B's words) the old
            // comment on this line used to warn about, and would still be
            // wrong if this ran again on the merged set.
            if (externalOffers.length && compareQueries.length <= 1) {
              push(checkingPhotosPhrase(externalQuery));
              // referenceImageUrl: the buyer's own photo, when this dead
              // end started from an image turn — see verifyOfferMatches'
              // own comment. This is the single-item path (the compare
              // branch above is excluded by compareQueries.length <= 1),
              // so one photo genuinely does represent the one thing being
              // searched for here.
              const verified = await verifyOfferMatches({
                query: externalQuery,
                offers: externalOffers,
                referenceImageUrl: imageUrl,
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
          // Found live: a buyer with a ₦400k budget got two listings back
          // with no price shown on either, presented with the same
          // confidence a verified match would have had. connectors/
          // index.ts's own filter already drops anything it can CONFIRM is
          // over budget (and now sorts a confirmed-affordable listing ahead
          // of an unpriced one when both are shown) — this is the other
          // half: telling the buyer plainly when NONE of what's on screen
          // could be confirmed to fit, rather than letting the reply imply
          // a fit it never checked.
          const unconfirmedBudgetNaira =
            effectiveBudget != null &&
            !externalOffers.some((o) => {
              const price = parseOfferPrice(o.priceText);
              return price != null && price <= effectiveBudget!;
            })
              ? effectiveBudget
              : undefined;
          replyOverride = pickAvoiding(
            noVendorButOnlineOffersPhrase(
              deadEndTerm,
              unconfirmedBudgetNaira,
              // Only when a comparison will actually render below — the
              // wording promises one, so it must not appear on a compare
              // turn that produced too few offers to compare.
              isCompareTurn && externalOffers.length >= 2,
            ),
            [],
          );
        } else if (
          deadEndTerm &&
          deadEndHasNamedItem &&
          !alreadyGaveGuidanceThisRequest &&
          // NEVER for a service (2026-09-16, explicit request, found live:
          // "a good barber that does home service" dead-ended on Velte and
          // got a list of invented CATEGORY names — "mobile barber
          // services", "barbering on demand", "mobile grooming specialists"
          // — sitting on top of three real, mappable Google Places barbers).
          // suggestBuyingGuidance's whole value is naming a real, checkable
          // PRODUCT (a brand, a model) a buyer can then ask for by name; a
          // service has no such thing to name — every "suggestion" is just
          // the same category re-worded, and it reads as filler in front of
          // the vendor cards that are the actual answer. Decided by the
          // scope check's own seekingKind first (allowsNearbyBusinesses'
          // explicit half), the keyword heuristic only as its fallback —
          // the same single check that already routes Google Places.
          !allowsNearbyBusinesses(deadEndTerm, allowNearbyBusinesses) &&
          // And never when real off-Velte VENDORS were already found (Google
          // Places, Instagram) — this branch's own comment below has always
          // said "nothing on Velte, nothing NEARBY, nothing online either",
          // but only the online-offers half was ever actually checked (the
          // `if` this is the else of). A buyer looking at three real
          // businesses doesn't need four invented names above them.
          externalStoreSuggestions.length === 0 &&
          instagramLeads.length === 0
        ) {
          // Found live: "a good phone for content creation" dead-ended —
          // correctly, the catalogue genuinely has nothing — but the buyer
          // walked away with only "nothing found," never told WHAT to
          // actually look for. This is the true, final dead end: nothing on
          // Velte, nothing nearby, nothing found online either. See
          // suggestBuyingGuidance's own top comment for why real product
          // names here are a narrower exception than "the model never
          // invents supply" sounds — it never claims Velte has any of them.
          //
          // GATED ON deadEndHasNamedItem (2026-09-15, found live) — see that
          // flag's own comment above. Without it, a searchStores-only dead
          // end ("Apple store", named by the model inferring a business
          // type, not by the buyer naming a product) got forced through the
          // same "suggest a real product" framing and produced nonsense
          // ("Apple Store App", "Apple Authorized Resellers") that isn't a
          // single real thing the buyer could act on. A store-type dead end
          // now just keeps the plain noVendorEvenBySectorPhrase line set
          // above instead — honest about nothing being found, with no
          // guidance bolted on that this tool was never built to give.
          //
          // ALSO GATED ON !alreadyGaveGuidanceThisRequest (2026-09-15, found
          // live, widened same day from a same-turn-only !pendingGuidanceReply
          // check — see that flag's own comment for the comparison-hop gap
          // this widening closes) — a buyer who confirmed "both" of a
          // guidance reply's own suggestions, and got a genuine dead end
          // checking THOSE against Velte, got a SECOND round of invented
          // suggestions instead of a plain "still nothing" — a car-battery
          // guidance reply led to ANOTHER guidance reply naming three
          // different battery brands nobody asked about, an unbounded chain
          // rather than an honest stop. suggestBuyingGuidance exists for the
          // FIRST dead end, where the buyer has nothing to go on yet; once
          // they're already
          // holding real suggestions and Velte still comes up empty for
          // them, more invented names don't help — the plain dead-end line
          // set above is the honest, final answer.
          //
          // Found live: a buyer who answered the bare-query gate's own
          // budget question ("I have 150k") still got suggestions with no
          // regard for it (a Galaxy A54, which sells for several times
          // that) — `effectiveBudget` above is only ever computed inside
          // the `hasExternalConnectors()` branch, so a dead end reached any
          // other way carried no budget into this call at all even though
          // one had been stated. Resolved independently here with the same
          // precedence usableBudget's other call sites already use, so this
          // never depends on whether external connectors happened to run.
          const guidanceBudget =
            effectiveBudget ??
            usableBudget(
              (productCall?.input as { maxBudgetNaira?: number } | undefined)
                ?.maxBudgetNaira,
            ) ??
            usableBudget(rememberedBudget);
          const guidance = await suggestBuyingGuidance({
            need: deadEndTerm,
            isService: looksLikeServiceTask(deadEndTerm),
            maxBudgetNaira: guidanceBudget,
          });
          // REPLACES the canned dead-end sentence rather than appending to
          // it — guidance already says plainly that Velte has nothing, so
          // stacking a separate "couldn't find a match" line in front of it
          // read as a form-letter apology before the actually useful part.
          // The canned sentence still stands untouched whenever guidance
          // itself fails (network, timeout, no usable suggestions) — this
          // can only ever improve the dead end, never be the reason a buyer
          // sees a worse one.
          if (guidance) {
            replyOverride = guidance;
            usedGuidanceReply = true;
          }
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
            // Normalized before it's STORED, so a stray 0 can't be
            // remembered and re-applied as a real ceiling on every later
            // turn of the same request (see usableBudget).
            maxBudgetNaira:
              usableBudget(input?.maxBudgetNaira) ??
              usableBudget(rememberedBudget) ??
              null,
            attributes: Array.isArray(input?.attributes)
              ? input.attributes
              : undefined,
          };
        }

        let recommendation: AnyRecommendation | null = null;
        // What the buyer actually SEES this turn — defaults to the raw
        // outcome, overwritten below once verification has run. Kept
        // separate from `stores`/`furtherStores` themselves because those
        // are `const`s destructured from `outcome` above, read by other
        // branches (the `nothingOnVelte` dead-end check, `storeServices`)
        // that need the PRE-verification count/shape.
        let displayStores = stores;
        let displayFurtherStores = furtherStores;

        // Kind-of-BUSINESS verification, for EVERY store search that found
        // something — not just a compare turn (2026-09-15, found live: a
        // buyer followed up "can I get a vendor or shop where I can get
        // this" after a TV search, and an unrelated shoes/bags/bakery
        // vendor came back as a "similar" match with nothing to catch it).
        // This used to run ONLY inside the isCompareTurn branch below — see
        // verifyStoreMatches.ts's own header on why that gap existed in the
        // first place (there was never any kind-of-business check for
        // stores at all until the compare path got one) — which meant the
        // single, far more common ordinary store search still had zero
        // protection against exactly the failure mode that fix was built
        // for. Hoisted up here so both paths share one verification pass
        // instead of the compare branch running its own second one.
        if (!clarification && (stores.length || furtherStores.length)) {
          // The store search's OWN term first, with the buyer's words as
          // context (2026-09-23, was `message || storesQuery`). On a
          // follow-up turn the message is often just the answer to a
          // question — found live: "2 million naira, my purpose is
          // residential" was what a real-estate vendor got verified
          // against, and a caterer-that-also-sells-land was dropped for
          // not offering "2 million naira". The term alone would lose a
          // paraphrase the model got wrong, which is why the message still
          // rides along.
          const storeQuery =
            storesQuery && message && storesQuery !== message
              ? `${storesQuery} (the buyer's own latest message: "${message}")`
              : storesQuery || message || "what you asked for";
          const [storeVerification, furtherStoreVerification] =
            await Promise.all([
              verifyStoreMatches({
                businessType: storeQuery,
                stores,
                services: storeServices,
              }),
              verifyStoreMatches({
                businessType: storeQuery,
                stores: furtherStores,
                services: storeServices,
              }),
            ]);
          if (storeVerification.rejected.length) {
            console.info(
              `[search] dropped ${storeVerification.rejected.length} wrong-kind vendor(s) for "${storeQuery}":`,
              storeVerification.rejected.map(
                (r) => `${r.match.name} → ${r.actualBusiness}`,
              ),
            );
            displayStores = storeVerification.kept;
          }
          if (furtherStoreVerification.rejected.length) {
            console.info(
              `[search] dropped ${furtherStoreVerification.rejected.length} wrong-kind further vendor(s) for "${storeQuery}":`,
              furtherStoreVerification.rejected.map(
                (r) => `${r.match.name} → ${r.actualBusiness}`,
              ),
            );
            displayFurtherStores = furtherStoreVerification.kept;
          }
          // Every store the model saw was dropped, and nothing else is on
          // screen. The model wrote its reply BEFORE this pass, about those
          // stores — found live: "take a look at the card below" with no
          // card below it. Replaced with the same honest dead-end line a
          // store search that found nothing gets, unless something upstream
          // already chose the reply.
          if (
            replyOverride === null &&
            displayStores.length === 0 &&
            displayFurtherStores.length === 0 &&
            products.length === 0 &&
            vendorProducts.length === 0
          ) {
            const deadEndTermForReply = storesQuery || "that";
            replyOverride = pickAvoiding(
              noVendorEvenBySectorPhrase(
                deadEndTermForReply,
                externalStoreSuggestions.length > 0 ||
                  instagramLeads.length > 0,
                looksLikeServiceTask(deadEndTermForReply),
              ),
              [],
            );
          }
        }
        // The distinct-terms guard: when the model called searchProducts
        // more than once for genuinely DIFFERENT items in one turn (a
        // multi-need message the dual-intent interception declined to
        // split), `products` is a merged pool of unrelated needs — a
        // "Top pick" crowned across a laptop and a caterer is nonsense, so
        // no recommendation at all is the honest outcome. Retries that
        // re-search the SAME item under slightly different phrasing still
        // pass (compared as normalized terms).
        //
        // isCompareTurn is the one deliberate exception (2026-09-05): a
        // genuine compare request ("Infinix Hot 50i vs Samsung Galaxy A15")
        // is explicitly instructed (see systemPrompt.ts's own toolNote) to
        // call searchProducts separately per named thing — so MULTIPLE
        // distinct terms is exactly the expected, desired shape here, not
        // the unrelated-needs case this guard exists to catch. Skipping the
        // guard on a compare turn is what lets the comparison actually run
        // across the two named phones instead of being silently dropped.
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
          (distinctProductTerms.size <= 1 || isCompareTurn)
        ) {
          push(comparingOptionsPhrase(products.length));
          const productInput = productCall?.input as
            | { product?: string }
            | undefined;
          const query =
            message || productInput?.product || "the item in the photo";
          // isCompareTurn (explicit Compare tool, aligned, or auto-detected
          // — see comparisonRule.ts) gets the full "Universal Comparison
          // Template" (comparisonTemplate.ts); every other multi-result turn
          // keeps the lighter picks-only recommendResults.ts call, unchanged.
          // Same Velte/external boundary as before either way (2026-09-05
          // product decision: no merge) — this only ever swaps which
          // BUILDER runs over whichever single candidate list this branch
          // already has.
          recommendation = isCompareTurn
            ? await buildVelteComparisonTemplate({ query, products })
            : await pickRecommendation({ query, products });
        } else if (isCompareTurn && !clarification && stores.length >= 2) {
          // SERVICE PROVIDERS / stores (2026-09-05). The design doc's own
          // worked example is "compare wedding photographers in Port
          // Harcourt" — a searchStores turn — and until now that produced no
          // comparison at all: both branches around this one only ever ran
          // over searchProducts results or external offers, so the entire
          // vendor half of Velte (tailors, mechanics, caterers,
          // photographers, electricians — everyone found by STORE rather
          // than by listing) fell straight through to a plain carousel.
          //
          // Gated on isCompareTurn alone, deliberately: the ordinary
          // picks layer has never run over stores, and quietly switching it
          // on for every store search would change a path nobody asked to
          // change. A compare turn is the one place it was explicitly asked
          // for.
          push(comparingOptionsPhrase(stores.length));
          const compareQuery = message || storesQuery || "what you asked for";

          // Kind-of-BUSINESS verification already ran above (shared with
          // the ordinary, non-compare store search path — see that block's
          // own comment) — `displayStores`/`displayFurtherStores` are
          // already the verified lists, nothing left to do here.

          // Verification can bring the count under 2 — buildStoreComparisonTemplate
          // already returns null in that case (same as any comparison with
          // too few real candidates), so nothing extra to guard here.
          recommendation = await buildStoreComparisonTemplate({
            query: compareQuery,
            stores: displayStores,
            // Each vendor's own matching listings — where a service
            // provider's only real price comes from (see storePriceLabel).
            services: storeServices,
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
          const query =
            message || productInput?.product || "the item in the photo";
          recommendation = isCompareTurn
            ? await buildExternalComparisonTemplate({
                query,
                offers: externalOffers,
              })
            : await pickExternalRecommendation({
                query,
                offers: externalOffers,
              });
        }

        // Vendor-search offer (2026-09-15, explicit request, narrowed to
        // external-offers-only the same day) — after real off-Velte
        // product offers are shown on a genuine dead end (see the scope
        // guard below for why a Velte match is deliberately excluded), a
        // separate Yes/No block below the cards asks whether the buyer
        // would rather have a vendor make/provide the item directly
        // instead of buying one of the shown items as-is. Deliberately
        // code-authored and deterministic
        // (like offerBuyerRequestTool's own signal), not left to the
        // model's own judgment about whether to ask — see this section's
        // own scope guards for why "reliably shows up on every qualifying
        // turn" matters more here than letting the model decide case by
        // case. The QUESTION TEXT itself is picked client-side
        // (SearchHome.tsx's own LOCAL_VENDOR_SEARCH_OFFER_QUESTIONS,
        // mirroring the existing reach-out offer's own client-picked
        // question) — this only ever carries the structural fact and the
        // search term the agreement turn needs.
        //
        // Scoped tightly, matching every other narrow-first feature in
        // this file:
        // - "only products" per the explicit request — never when this
        //   turn was (also) a store search, and never without a real
        //   product term to search vendors FOR.
        // - EXTERNAL OFFERS ONLY (2026-09-15, narrowed per explicit
        //   follow-up request) — never when Velte itself matched
        //   something. A Velte product card already carries a real vendor
        //   relationship (the WhatsApp "Chat" button IS a vendor, right
        //   there); asking "want me to also look for a vendor?" under a
        //   card that already has one is redundant at best and confusing
        //   at worst. This offer only earns its place where the buyer
        //   genuinely has NO vendor path yet — real off-Velte listings
        //   (Jumia/Shopify) with no chat, no relationship, nothing to act
        //   on beyond a link. `products.length === 0` is what enforces
        //   that: it can only ever be true on a genuine Velte dead end.
        // - never on a compare turn — that already ends with its own
        //   "want this found on Velte?" ask; stacking a second offer would
        //   double up.
        // - never on the SAME turn as a reach-out offer or an open
        //   clarification — one open question per turn, not two.
        const vendorSearchProductInput = productCall?.input as
          | { product?: string; attributes?: string[] }
          | undefined;
        const vendorSearchTerm = vendorSearchProductInput?.product
          ? buildProductTerm(
              vendorSearchProductInput.product,
              usableAttributes(vendorSearchProductInput.attributes),
            )
          : null;
        const vendorSearchOffered =
          !isCompareTurn &&
          !buyerRequestOffered &&
          !clarification &&
          stores.length === 0 &&
          products.length === 0 &&
          Boolean(vendorSearchTerm) &&
          externalOffers.length > 0;

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
          stores: displayStores,
          furtherStores: displayFurtherStores,
          storesQuery,
          productStores,
          storeServices,
          productsMatchTier,
          storesMatchTier,
          productsMatchQuality,
          storesMatchQuality,
          externalStoreSuggestions,
          instagramLeads,
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
          awaitingVendorSearchOffer: vendorSearchOffered,
          vendorSearchMatchQuery: vendorSearchOffered ? vendorSearchTerm : null,
          recommendation,
          externalOffers,
          // Resolved either way by the time this turn reaches here: a
          // FRESH comparison never gets this far (its own short-circuit
          // above ends the turn), and the confirmation turn's own exchange
          // is done once its results are shown — nothing left to route a
          // buyer's next message back into.
          awaitingComparisonPurchaseReply: false,
          comparisonPickItem: null,
          isGuidanceReply: usedGuidanceReply,
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
        // Instagram leads ride along (2026-09-16) — the same "a real,
        // unlisted business was just shown to a buyer" signal, just from the
        // third fallback tier instead of the second. The buyer actually
        // tapping Message on one is logged separately and more strongly (see
        // /api/search/instagram-reachout).
        if (externalStoreSuggestions.length > 0 || instagramLeads.length > 0) {
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
                instagramLeads,
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
