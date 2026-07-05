import { stepCountIs, type ModelMessage, type UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import { backendFetch } from "@/lib/server/backend";
import { searchProductsTool } from "@/lib/server/ai/searchProductsTool";
import { searchStoresTool } from "@/lib/server/ai/searchStoresTool";
import { understandingRequestPhrase } from "@/lib/server/ai/statusPhrases";
import type {
  MatchQuality,
  MatchTier,
  NearbyBusiness,
  SearchRequestBody,
  SearchStreamEvent,
  StoreMatch,
  VendorMatch,
} from "@/types/search";

// POST /api/search   (public — no buyer account, mirrors the public
// /store/[handle] pattern). Velte build-order step (d): streams a
// "staged reveal" — status events while the model + tool call are in
// flight (via callLLM, step (c)'s already-proven fallback-safe
// generateText call — never streamText, so a provider rate limit can never
// surface after content has already reached the client), then exactly one
// final event with the complete reply + results. Plain newline-delimited
// JSON, not the Vercel AI SDK's UIMessageChunk/useChat protocol — that's
// built for multi-turn chat history with token streaming, neither of which
// this single-turn "staged reveal" search needs.
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

// A function of whether buyerLocation was supplied, not a constant — the
// model only knows what's in its context. Silently resolving buyerLocation
// inside a tool's execute() is invisible to the model itself: without this
// paragraph, an image-only query with a real buyerLocation still gets asked
// "where are you?" because nothing ever told the model a location was
// already available. Found live while validating step (e).
function buildSystemPrompt(hasBuyerLocation: boolean): string {
  const locationNote = hasBuyerLocation
    ? `\n\nThe buyer's device location is already known server-side. If they haven't mentioned a different specific place, do NOT ask where they are — call the search tool with location set to "buyer's current location" and the real coordinates will be resolved automatically.`
    : "";

  return `You are Velte, a buyer-facing product discovery assistant for a Nigerian marketplace.

A buyer describes something they need, sometimes with a photo attached instead of (or alongside) text. If a photo is attached, identify the likely product/category from it before deciding what to search for — treat that identification with the same discipline as text: describe only what you can actually see, and if the photo is genuinely unclear, ask one short clarifying question rather than guess. Don't stop at the bare category (e.g. just "sneakers") — pass every visually identifiable detail (color, style, material, brand markings, pattern, etc.) into the tool's attributes field too. This isn't optional polish: a vague category-only description can only ever turn up loosely related items, while a specific one lets the system tell an exact match from a merely similar one.

You have two search tools — pick based on what the buyer actually described:
- If they name a SPECIFIC PRODUCT OR SERVICE (e.g. "white sneakers", "Tecno fast charger", "a haircut"), use searchProducts.
- If they describe a KIND OF BUSINESS/VENDOR/SHOP instead of an item (e.g. "a phone repair shop", "an electronics store near me", "a tailor"), use searchStores.
You MUST call one of these whenever the buyer names or shows something to look for. Never invent a vendor, store, price, or stock level: the tool result is the only source of truth for what's available. If the buyer's request doesn't mention where they are (a city or area) and none was already provided, don't guess a location — ask them one short clarifying question in plain text instead, and do NOT call a search tool with a placeholder location like "unknown" or "not specified" just to produce some answer.${locationNote}

After a tool returns, you MUST always end your turn with a short closing note in plain text — never stop right after a tool call with no text at all, even if you already have everything you need. Write only a brief closing note — one short sentence wrapping up the search, like a conclusion, not a rundown. The result cards shown below your reply already display each product/vendor's name, price, location, and distance, so do NOT restate any of that — don't name individual products/vendors, don't repeat prices, don't repeat locations. Just acknowledge what was found in general terms (e.g. "Found a couple of options near you — take a look below." or "Here's what's available close by."). The cards are the answer; your text is just the hand-off to them.

If the result includes items from elsewhere in the buyer's state rather than nearby (the tool result will indicate this), say so honestly in your closing note — e.g. "nothing right around you, but here's an option elsewhere in [state]" — never imply something is nearby when it isn't.

For a photo search, searchProducts' result also indicates matchQuality: "direct" (a close/exact match to what's in the photo — only those are returned, similar-but-not-matching items are already excluded) or "similar" (nothing that close, so the closest related items are shown instead). Reflect this honestly and plainly in your closing note — e.g. "Found an exact match!" for direct, or "Nothing identical, but here's something similar nearby." for similar. Never call a similar result an exact match.

If searchProducts returns zero results (no direct, no similar):
- If the buyer sent a photo, don't jump to a general market suggestion yet — call searchStores next, using a general business-type description for the photographed item's category (e.g. a photo of sneakers → businessType "shoe store" or "sneaker vendor"), to check for real nearby businesses — Velte vendors or otherwise — that might carry something like it.
- If the buyer only sent text (no photo), or searchStores was just called per the point above and it also came back with zero results AND no external suggestions, work out what category the item belongs to (e.g. "a phone charger" → electronics/accessories, "ankara fabric" → textiles, "a haircut" → grooming/salon services) and suggest 1-2 well-known physical markets or shopping clusters in Nigeria where that category is typically sold (e.g. Computer Village for phones/electronics, Alaba International Market for electronics, Balogun or Idumota for fabrics/textiles) — from your own general knowledge, clearly framed as a general suggestion, never as a specific listed vendor or a claim that anyone there has it in stock. Never claim a match the tool didn't return.

If searchStores found no Velte vendor but returned real nearby businesses (externalSuggestions, also shown as cards), note that these aren't yet listed on Velte and there's no "chat with vendor" for them — but don't repeat their name/address, the cards already show that. If you called searchStores as a fallback after an empty photo-based searchProducts, make that clear too — e.g. "Couldn't find that exact item, but here are nearby businesses that might have something like it."`;
}

function encodeEvent(event: SearchStreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

// A fallback model (Groq) can leak malformed function-call syntax directly
// into its final text instead of a real tool call or a real reply — found
// live (`<function.searchProducts({...})</function>`), distinct from the
// already-documented "calls the tool with a bad argument" failure modes.
// Never let a buyer see raw model-internal syntax.
const LEAKED_FUNCTION_CALL = /<\/?function[.=]/i;
function sanitizeReply(text: string): string {
  return LEAKED_FUNCTION_CALL.test(text)
    ? "Sorry, I had trouble processing that. Please try rephrasing your search."
    : text;
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
  const messages: ModelMessage[] = [{ role: "user", content }];

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
              ),
              searchStores: searchStoresTool(body?.buyerLocation, push),
            },
            // 3, not 2: with two tools now available, a step budget of 2
            // (call → final text) leaves no room for a final text step when
            // the model's second step is itself another tool call (e.g. a
            // redundant repeat call, or trying both searchProducts and
            // searchStores) — found live as `result.text` coming back empty
            // roughly half the time. 3 steps (call → possible second call →
            // final text) gives text generation a guaranteed last step.
            stopWhen: stepCountIs(3),
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
        const products = productResult?.results ?? [];
        const stores = storeResult?.results ?? [];
        const productsMatchTier = productResult?.matchTier ?? null;
        const storesMatchTier = storeResult?.matchTier ?? null;
        const productsMatchQuality = productResult?.matchQuality;
        const externalStoreSuggestions = storeResult?.externalSuggestions ?? [];

        controller.enqueue(
          encodeEvent({
            type: "final",
            reply: sanitizeReply(result.text),
            products,
            stores,
            productsMatchTier,
            storesMatchTier,
            productsMatchQuality,
            externalStoreSuggestions,
          }),
        );

        // Demand log (build-order step f) — awaited so it reliably
        // completes before the stream closes, never surfaced to the buyer:
        // they already have their answer from the "final" event above.
        try {
          const productInput = productCall?.input as
            | { product?: string; location?: string }
            | undefined;
          const storeInput = storeCall?.input as
            | { businessType?: string; location?: string }
            | undefined;
          const parsedProduct =
            productInput?.product ?? storeInput?.businessType;
          const parsedLocation = productInput?.location ?? storeInput?.location;

          await backendFetch("/search/log", {
            method: "POST",
            body: {
              rawQuery: message || null,
              hadImage: Boolean(imageUrl),
              parsed:
                parsedProduct || parsedLocation
                  ? {
                      product: parsedProduct ?? null,
                      location: parsedLocation ?? null,
                    }
                  : null,
              matched: products.length > 0 || stores.length > 0,
              resultVendorIds: products.map((p) => p.vendorId),
              resultStoreIds: stores.map((s) => s.storeId),
              usedExternalFallback: externalStoreSuggestions.length > 0,
              buyerLat: body?.buyerLocation?.lat ?? null,
              buyerLng: body?.buyerLocation?.lng ?? null,
              externalStoreSuggestions,
            },
          });
        } catch (err) {
          console.error("[search] demand log failed:", err);
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
