import { stepCountIs, type ModelMessage, type UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import { backendData, backendFetch } from "@/lib/server/backend";
import { searchProductsTool } from "@/lib/server/ai/searchProductsTool";
import { searchStoresTool } from "@/lib/server/ai/searchStoresTool";
import { getVendorProductsTool } from "@/lib/server/ai/getVendorProductsTool";
import { understandingRequestPhrase } from "@/lib/server/ai/statusPhrases";
import { buildSystemPrompt } from "@/lib/server/ai/systemPrompt";
import type {
  MatchQuality,
  MatchTier,
  NearbyBusiness,
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

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SearchRequestBody | null;
  const message = body?.message?.trim() ?? "";
  const imageUrl = body?.imageUrl;

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
      const push = (text: string) =>
        controller.enqueue(encodeEvent({ type: "status", text }));

      push(understandingRequestPhrase(Boolean(imageUrl)));

      try {
        const result = await callLLM(
          {
            system: buildSystemPrompt(Boolean(body?.buyerLocation)),
            messages,
            tools: {
              searchProducts: searchProductsTool(
                body?.buyerLocation,
                push,
                Boolean(imageUrl),
                imageUrl,
              ),
              searchStores: searchStoresTool(body?.buyerLocation, push),
              getVendorProducts: getVendorProductsTool(push),
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
          // Groq is text-only — never route an image query to it.
          imageUrl ? ["openai"] : ["openai", "groq"],
        );

        // .findLast, not .find: a fallback model (Groq) occasionally calls a
        // tool more than once for one turn — the last call is what its
        // final reply is actually synthesized from, found live during the
        // hardening pass.
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
              matchTier?: MatchTier;
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
        const products = productResult?.results ?? [];
        const stores = storeResult?.results ?? [];
        const productsMatchTier = productResult?.matchTier ?? null;
        const storesMatchTier = storeResult?.matchTier ?? null;
        const productsMatchQuality = productResult?.matchQuality;
        // What the model actually searched stores FOR this turn (e.g. "phone
        // repair shop", "tailor") — used to customize the WhatsApp
        // pre-filled message on a pure vendor/store card (no product
        // attached) instead of the generic "interested in what you offer."
        // Only meaningful when it's the sole intent, never for
        // productStores (a real product already names itself on that card).
        const storesQuery =
          (storeCall?.input as { businessType?: string } | undefined)
            ?.businessType ?? null;
        // Either tool can surface its own Google Places fallback (Tier 4) —
        // a dual-intent turn ("a phone repair shop that also sells white
        // sneakers") could in principle call both and get overlapping
        // nearby businesses back from each, so dedupe by placeId rather
        // than assuming only one tool ever populates this.
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
        const productStores = products.length
          ? await getVendorStoresForProducts(products)
          : [];
        // Did the model actually search this turn, or just reply in plain
        // text (a clarifying question — see systemPrompt.ts)? Every array
        // above is empty either way, so the frontend needs this to tell the
        // two apart.
        const toolCalled = result.toolCalls.length > 0;

        controller.enqueue(
          encodeEvent({
            type: "final",
            reply: sanitizeReply(result.text),
            toolCalled,
            products,
            stores,
            storesQuery,
            productStores,
            productsMatchTier,
            storesMatchTier,
            productsMatchQuality,
            externalStoreSuggestions,
            vendorProducts,
            vendorProductsStore,
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

            await backendFetch("/search/log", {
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
