import { tool } from "ai";
import { z } from "zod";

import { aiSearchData } from "@/lib/server/aiSearchBackend";
import { resolveSearchLocation } from "@/lib/server/ai/resolveBuyerCoords";
import {
  searchingPhrase,
  foundCountPhrase,
  directMatchPhrase,
  similarMatchPhrase,
  noProductMatchPhrase,
} from "@/lib/server/ai/statusPhrases";
import type {
  BuyerLocation,
  MatchTier,
  MatchQuality,
  NearbyBusiness,
  VendorMatch,
} from "@/types/search";

const inputSchema = z.object({
  product: z
    .string()
    .describe("The specific product or service the buyer is looking for."),
  attributes: z
    .array(z.string())
    .optional()
    .describe(
      "Specific attributes — color, size, brand, material, style, condition, etc. Include these whether the buyer typed them OR you can see them in an attached photo — for a photo, describe everything visually identifiable, not just the bare category, so matching can tell an exact match from a loosely related one.",
    ),
  // Optional on purpose: set this ONLY when the buyer's own message names or
  // clearly implies a specific place. Omit it entirely otherwise — the
  // buyer's device location (if known) is used automatically, and if
  // neither exists the search simply runs nationwide rather than asking a
  // clarifying question.
  location: z
    .string()
    .optional()
    .describe(
      "The place name or area the buyer's message itself named, if any (e.g. 'Enugu' or 'Independence Layout, Enugu'). Omit if the buyer didn't mention a place — do not guess or fill in a placeholder like 'unknown'.",
    ),
  radiusKm: z
    .number()
    .optional()
    .describe("Search radius in km. Defaults to 10 if not specified."),
});

/**
 * For a buyer naming a *specific item* — as opposed to searchStoresTool,
 * which is for a buyer describing a kind of business/vendor rather than a
 * product. Renamed from searchVendorsTool: that name was itself part of the
 * product-vs-vendor confusion this split fixes.
 *
 * `buyerLocation` — real coordinates from the request body (e.g. browser
 * geolocation) — used only when the buyer didn't name a different place in
 * their query; an explicit `location` always wins over it (see
 * resolveSearchLocation). If neither exists, the search runs nationwide.
 * `push` reports progress text at the same two points spec §7 describes.
 * `isImageQuery` — true when the buyer's turn included a photo — the
 * direct-vs-similar match tiering (backend-side) applies either way, this
 * only picks which status phrasing narrates a "direct" result (a text
 * search's own default "N found" phrasing already reads confidently enough
 * on its own; only "similar" needs an explicit callout regardless of kind).
 * `imageUrl` — the buyer's actual photo (not the LLM's text description of
 * it) — passed straight through to the backend so it can be embedded via
 * voyage-multimodal-3 and compared against product image embeddings, not
 * just matched on a text paraphrase.
 * `weakResultsOut` — a side channel, not part of this tool's return value.
 * The backend also returns up to 2 "not that close" candidates alongside
 * the real results (see WEAK_MATCH_LIMIT in retrieval.service.js) — these
 * are a UI-only supplement route.ts renders directly, same reasoning as
 * productStores (route.ts's own comment): the system prompt already forbids
 * the model from restating card-level detail in its closing note (see
 * systemPrompt.ts), so a weak match's whole point — "not a great match,
 * shown anyway" — has no safe way to enter the model's return value without
 * risking it narrating specifics about a deliberately low-confidence
 * result. Stashed here instead of returned, so it's simply never part of
 * what the model sees or can talk about.
 */
export function searchProductsTool(
  buyerLocation?: BuyerLocation,
  push?: (candidates: string[]) => void,
  isImageQuery = false,
  imageUrl?: string,
  weakResultsOut?: { current: VendorMatch[] },
) {
  return tool({
    description:
      "Search the live catalog for a SPECIFIC PRODUCT OR SERVICE by meaning, proximity, and trust — use this when the buyer names an item they want to buy (e.g. 'white sneakers', 'Tecno fast charger'). For a buyer describing a kind of business/vendor/shop instead of an item, use searchStores. Returns real listings only — never invent a vendor, price, or stock level beyond what this tool returns.",
    inputSchema,
    execute: async ({ product, attributes, location, radiusKm }) => {
      // Best-effort status text before we know the resolved coordinates —
      // an explicit place is shown as-is; otherwise "your area" if a
      // device location is known, or nothing (nationwide phrasing) if not.
      push?.(
        searchingPhrase(
          product,
          location ?? (buyerLocation ? "your area" : undefined),
        ),
      );

      const resolved = await resolveSearchLocation(buyerLocation, location);
      if (resolved.kind === "not-found") {
        return {
          error: "location-not-found" as const,
          message: `Couldn't find "${resolved.queriedText}" — ask the buyer for a more specific area.`,
        };
      }
      const coords = resolved.kind === "coords" ? resolved.coords : undefined;

      const queryText = [product, ...(attributes ?? [])].join(" ");
      let results: VendorMatch[],
        weakResults: VendorMatch[],
        matchTier: MatchTier,
        matchQuality: MatchQuality,
        externalSuggestions: NearbyBusiness[] | null;
      try {
        ({
          results,
          weakResults,
          matchTier,
          matchQuality,
          externalSuggestions,
        } = await aiSearchData<{
          results: VendorMatch[];
          weakResults: VendorMatch[];
          matchTier: MatchTier;
          matchQuality: MatchQuality;
          externalSuggestions: NearbyBusiness[] | null;
        }>("/search/products", {
          method: "POST",
          body: {
            queryText,
            lat: coords?.lat,
            lng: coords?.lng,
            radiusKm: radiusKm ?? 10,
            isImageQuery,
            imageUrl,
          },
        }));
      } catch (err) {
        // Was uncaught — the AI SDK swallows the thrown error into a generic
        // tool-error the model then apologizes for, with no trace of *why*
        // (timeout vs DNS vs 5xx) in Vercel's logs. Log before rethrowing so
        // the failure is diagnosable instead of a silent LLM-authored apology.
        console.error(
          "[searchProductsTool] aiSearchData(/search/products) failed:",
          err,
        );
        throw err;
      }

      if (results.length) {
        if (isImageQuery && matchQuality === "direct") {
          push?.(directMatchPhrase(results.length));
        } else if (matchQuality === "similar") {
          push?.(similarMatchPhrase(results.length));
        } else {
          push?.(foundCountPhrase(results.length, "product", matchTier));
        }
      } else {
        push?.(noProductMatchPhrase());
      }

      // Side channel, not this tool's return value — see weakResultsOut's
      // own doc comment above for why.
      if (weakResultsOut) weakResultsOut.current = weakResults;

      // A mechanical fact, not left to the model's own inference: `coords`
      // truthy means a REAL place was actually searched (the buyer's device
      // location or a named place) — Tiers 1-3 (local/nearby/state) already
      // ran and came up empty before this Tier-4 nationwide fallback ever
      // fires, so a result here is genuinely from elsewhere in the country,
      // not "close by". Found live: the model narrated a real-but-distant
      // Tier-4 match (an Anambra caterer for an Enugu buyer) as if it were
      // nearby — relying on the system prompt's general reasoning about
      // matchTier + location context wasn't reliable enough on its own.
      // Handing it this as a direct, already-resolved fact instead of
      // something to re-derive removes that failure mode.
      const locationNote =
        matchTier === "nationwide"
          ? coords
            ? "Nothing matched within the search radius, the wider area, or even the buyer's own state — these results are from elsewhere in the country. You MUST say plainly that nothing was found nearby BEFORE presenting them, naming the actual state each result is in (its own `state` field) rather than implying it's close by."
            : "No location signal existed for this search at all (no place named, no device location) — these results are ranked purely by relevance across all of Velte, not by distance. Say so honestly rather than implying proximity."
          : undefined;

      return {
        results,
        matchTier,
        matchQuality,
        externalSuggestions: externalSuggestions ?? [],
        ...(locationNote ? { locationNote } : {}),
      };
    },
  });
}
