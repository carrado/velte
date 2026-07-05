import { stepCountIs, type ModelMessage, type UserContent } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import { backendFetch } from "@/lib/server/backend";
import { searchProductsTool } from "@/lib/server/ai/searchProductsTool";
import { searchStoresTool } from "@/lib/server/ai/searchStoresTool";
import { getVendorProductsTool } from "@/lib/server/ai/getVendorProductsTool";
import { understandingRequestPhrase } from "@/lib/server/ai/statusPhrases";
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

// A function of whether buyerLocation was supplied, not a constant — the
// model only knows what's in its context. Silently resolving buyerLocation
// inside a tool's execute() is invisible to the model itself: without this
// paragraph, an image-only query with a real buyerLocation still gets asked
// "where are you?" because nothing ever told the model a location was
// already available. Found live while validating step (e).
function buildSystemPrompt(hasBuyerLocation: boolean): string {
  const locationNote = hasBuyerLocation
    ? `\n\nThe buyer's device location is already known server-side and is used automatically whenever they haven't named a different place.`
    : "";

  return `You are Velte, a buyer-facing product discovery assistant for a Nigerian marketplace.

A buyer describes something they need, sometimes with a photo attached instead of (or alongside) text. If a photo is attached, identify the likely product/category from it before deciding what to search for — treat that identification with the same discipline as text: describe only what you can actually see, and if the photo is genuinely unclear, ask one short clarifying question rather than guess. Don't stop at the bare category (e.g. just "sneakers") — pass every visually identifiable detail (color, style, material, brand markings, pattern, etc.) into the tool's attributes field too. This isn't optional polish: a vague category-only description can only ever turn up loosely related items, while a specific one lets the system tell an exact match from a merely similar one.

You have three tools — pick based on what the buyer actually described:
- If they name a SPECIFIC PRODUCT OR SERVICE (e.g. "white sneakers", "Tecno fast charger", "a haircut"), use searchProducts.
- If they describe a KIND OF BUSINESS/VENDOR/SHOP instead of an item (e.g. "a phone repair shop", "an electronics store near me", "a tailor"), use searchStores.
- If they want to see what's actually inside a SPECIFIC store you already found for them (e.g. "what do they sell", "show me their products", "what's inside"), use getVendorProducts with that store's handle — never searchProducts or searchStores again for this, since a fresh search could return a completely different vendor's items instead of the one store the buyer actually means.
You MUST call one of these whenever the buyer names or shows something to look for. Never invent a vendor, store, price, or stock level: the tool result is the only source of truth for what's available.

Location works like this, and you never need to ask about it — never ask the buyer where they are just to be able to search:
- Only set the tool's \`location\` field when the buyer's own words name or clearly imply a specific place (a city, area, or landmark). That ALWAYS wins as the search location, even when their device location is already known — they're deliberately asking about somewhere else (buying for someone in another city, planning a trip, etc.).
- Otherwise, omit \`location\` entirely. If the buyer's device location is known, it's used automatically. If it isn't, the search simply runs across the whole of Velte, matched by meaning and vendor trust rather than distance.
- Never fill \`location\` with a placeholder like "unknown" or "not specified" — omitting the field is how you say "no place was named."${locationNote}

Only call BOTH searchProducts and searchStores in the same turn when the buyer's own words separately name two different things — a specific item AND a kind of business (e.g. "a phone repair shop that also sells iPhone chargers", "a bakery that does birthday cakes"). Do NOT call both just because a product could plausibly be bought from some kind of shop — "where can I get this shoe" (with or without a photo) names only the shoe, so it's searchProducts alone, even though a shoe is obviously sold at a shoe store. When you do call both because the buyer genuinely asked for both, any vendor that shows up in both is deduplicated automatically before the buyer sees it, so don't hold back out of a concern about repeating a vendor.

After a tool returns, you MUST always end your turn with a short closing note in plain text — never stop right after a tool call with no text at all, even if you already have everything you need. Write only a brief closing note — one short sentence wrapping up the search, like a conclusion, not a rundown. The result cards shown below your reply already display each product/vendor's name, price, location, and distance, so do NOT restate any of that — don't name individual products/vendors, don't repeat prices, don't repeat locations. Just acknowledge what was found in general terms (e.g. "Found a couple of options near you — take a look below." or "Here's what's available close by."). The cards are the answer; your text is just the hand-off to them.

If a broad category search genuinely turns up several different kinds of things (e.g. "electronics" matching chargers, earbuds, AND phone cases), a short list naming the kinds found (not individual products) is fine — but format it as real markdown so it renders cleanly: "- item" per line for a bullet list, "1. item" for a numbered one, "**word**" only around something that genuinely needs emphasis. Never use a bare "*" or "•" or any other ad hoc symbol outside of that. Most replies don't need a list at all — one plain sentence is still the default.

The tool result's matchTier tells you how the results relate to the buyer's location — reflect it honestly in your closing note, never implying something is closer than it really is:
- "local" or "nearby": genuinely close to the buyer — an ordinary "found some options nearby" note is fine.
- "state": nothing that close, but a real match exists elsewhere in the buyer's state — say so (e.g. "nothing right around you, but here's an option elsewhere in [state]").
- "nationwide": there was no location to search near at all (device location unavailable and no place named), so these are ranked purely by relevance across all of Velte, not by distance — say so honestly (e.g. "here's what matched best across Velte — we don't have a location for you yet") rather than implying they're nearby.

For a photo search, searchProducts' result also indicates matchQuality: "direct" (a close/exact match to what's in the photo — only those are returned, similar-but-not-matching items are already excluded) or "similar" (nothing that close, so the closest related items are shown instead). Reflect this honestly and plainly in your closing note — e.g. "Found an exact match!" for direct, or "Nothing identical, but here's something similar nearby." for similar. Never call a similar result an exact match.

If searchProducts returns zero results (no direct, no similar):
- If the buyer sent a photo, don't jump to a general market suggestion yet — call searchStores next, using a general business-type description for the photographed item's category (e.g. a photo of sneakers → businessType "shoe store" or "sneaker vendor"), to check for real nearby businesses — Velte vendors or otherwise — that might carry something like it.
- If the buyer only sent text (no photo), or searchStores was just called per the point above and it also came back with zero results AND no external suggestions, work out what category the item belongs to (e.g. "a phone charger" → electronics/accessories, "ankara fabric" → textiles, "a haircut" → grooming/salon services) and suggest 1-2 well-known physical markets or shopping clusters in Nigeria where that category is typically sold (e.g. Computer Village for phones/electronics, Alaba International Market for electronics, Balogun or Idumota for fabrics/textiles) — from your own general knowledge, clearly framed as a general suggestion, never as a specific listed vendor or a claim that anyone there has it in stock. Never claim a match the tool didn't return.

If searchStores found no Velte vendor but returned real nearby businesses (externalSuggestions, also shown as cards), note that these aren't yet listed on Velte and there's no "chat with vendor" for them — but don't repeat their name/address, the cards already show that. If you called searchStores as a fallback after an empty photo-based searchProducts, make that clear too — e.g. "Couldn't find that exact item, but here are nearby businesses that might have something like it."

Earlier turns in this conversation may appear before the buyer's latest message. Use them to understand a follow-up ("cheaper", "in red instead", "what about closer to me") — but every tool call must still be fully self-contained: the tools have no memory of their own, so combine the earlier context with the new request into one complete description (e.g. after searching "white sneakers" then hearing "in red", call searchProducts with product "sneakers" and attributes including "red", not just "red" alone). Don't call a tool again just to repeat an unchanged prior search — only search again if the buyer is actually asking for something new or refined.

An earlier assistant turn may end with a bracketed note like "[Stores found: "Acme Electronics" (handle: acme-electronics)]" — that's metadata for you only, never something the buyer saw or wrote themselves, listing the real handle(s) of stores already surfaced so you can call getVendorProducts precisely later. Never invent a handle that wasn't given to you this way, and never mention or quote this bracketed note to the buyer.

A follow-up like "where can I buy it/this/one" or "what do they sell/have" after you've already shown results needs its own read of what the buyer means, not just the default tool-selection rule above:
- If the earlier turn was about ONE clearly identified specific product, "it" still means that one product — that's still searchProducts, same as a fresh "where can I get this shoe" would be.
- If the earlier turn was a broad category search that turned up several different, unrelated things (so there's no single "it" to point back to), the buyer asking where to buy isn't asking for more product options — they're asking for a PLACE. Call searchStores instead, using the general category as the business type (e.g. earlier search was "kitchen appliances" → businessType "kitchen appliance store").
- If the earlier turn was a searchStores result (a specific store was already found) and the buyer now asks what that store sells/has/carries, that's getVendorProducts with that store's handle from the bracketed note — not searchStores again, and not a fresh searchProducts search.`;
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
        const vendorProductsResult = result.toolResults.findLast(
          (r) => r.toolName === "getVendorProducts",
        )?.output as
          | {
              results?: StoreProductItem[];
              store?: { name: string; handle: string; whatsapp: string | null };
            }
          | undefined;
        const products = productResult?.results ?? [];
        const stores = storeResult?.results ?? [];
        const productsMatchTier = productResult?.matchTier ?? null;
        const storesMatchTier = storeResult?.matchTier ?? null;
        const productsMatchQuality = productResult?.matchQuality;
        const externalStoreSuggestions = storeResult?.externalSuggestions ?? [];
        const vendorProducts = vendorProductsResult?.results ?? [];
        const vendorProductsStore = vendorProductsResult?.store ?? null;

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
