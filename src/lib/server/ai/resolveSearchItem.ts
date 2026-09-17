import { buildProductTerm } from "@/lib/productTerm";
import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import { searchStoresCore } from "@/lib/server/ai/searchStoresTool";
import {
  getSectorClarifiers,
  buildClarifyingQuestion,
  looksLikeServiceTask,
} from "@/lib/server/ai/sectorClarifiers";
import { getAttributeSchemaOverrides } from "@/lib/server/attributeSchemas";
import {
  pickAvoiding,
  foundPossibleVendorPhrase,
  noVendorEvenBySectorPhrase,
} from "@/lib/server/ai/statusPhrases";
import type {
  BuyerLocation,
  SearchItemInput,
  SearchItemOutcome,
} from "@/types/search";

export type { SearchItemInput, SearchItemOutcome };

export function searchItemTerm(item: SearchItemInput): string {
  return item.type === "product"
    ? buildProductTerm(item.product, item.attributes)
    : item.businessType;
}

/**
 * Resolves ONE named item to completion: first a deterministic clarify
 * check (see below), then its own search (products for a "product" item,
 * stores for a "store" item), and if THAT comes back empty, cross-check the
 * OTHER index with the same term — the exact technique route.ts's own
 * unified dead-end handler uses (see that file's comment on why a
 * cross-index check, not a wider radius, is what actually finds something
 * new). A real product/service LISTING found via the cross-check is treated
 * as a confirmed match ("products"); a store found only by sector/
 * description is unconfirmed, so it becomes an "offer" instead of a plain
 * result. No LLM call anywhere in here — fully deterministic, cheap enough
 * to run from a background fetch with no buyer-visible cost beyond the
 * network round trip. (The resolve-item ROUTE layers the Phase 3
 * recommendation call on top of a "products" outcome — that's the route's
 * own separately-budgeted enhancement, deliberately outside this
 * function's deterministic contract.)
 */
export async function resolveSearchItem(
  item: SearchItemInput,
  location: string | undefined,
  buyerLocation: BuyerLocation | undefined,
  push?: (candidates: string[]) => void,
): Promise<SearchItemOutcome> {
  const term = searchItemTerm(item);
  // See statusPhrases.ts's own noVendorEvenBySectorPhrase comment — a
  // service isn't something a vendor "carries"/"has", so every dead-end
  // phrase built from `term` in this function needs to know which wording
  // fits. Computed once here rather than at each call site below.
  const isService = looksLikeServiceTask(term);

  // One deterministic clarify round for a genuinely bare item — the exact
  // sector-field data buildSystemPrompt's own sectorNote draws from for an
  // ordinary single-turn searchProducts request, usable here too because
  // sector detection is plain token-matching, not an LLM judgment (see
  // sectorClarifiers.ts). Per explicit request this is NOT gated behind
  // "is this item part of a dual-intent split" — it fires for any item
  // resolved through this deterministic path, single- or dual-intent alike,
  // product or store term alike (the main LLM flow's own sectorNote only
  // ever covers the searchProducts, single-intent case). `item.clarified`
  // is the hard cap: SearchHome.tsx sets it once it folds the buyer's
  // answer back into a fresh item, so this can never ask a second time for
  // the same item, matching the "ask ONCE" rule the LLM path holds itself
  // to.
  //
  // A "store" item has no attributes-equivalent field at all (businessType
  // is always just a short category phrase — see systemPrompt.ts's own
  // extraction rules), so it's always treated as bare here; a "product"
  // item is bare only when the earlier extraction turn found nothing
  // distinguishing to attach as `attributes`.
  if (!item.clarified) {
    // Phase 2: DB-tuned question schemas, same cached/degrading fetch the
    // main route uses — this stays the path's only nondeterminism, and it
    // resolves to the in-code presets whenever the overrides can't help.
    const sector = getSectorClarifiers(
      term,
      undefined,
      await getAttributeSchemaOverrides(),
    );
    const isBare = item.type === "product" ? !item.attributes?.length : true;
    if (sector && isBare) {
      return {
        status: "needs_clarification",
        question: buildClarifyingQuestion(term, sector.fields),
      };
    }
  }

  if (item.type === "product") {
    const primary = await searchProductsCore(
      { product: item.product, attributes: item.attributes, location },
      { buyerLocation, push },
    );
    if ("error" in primary) {
      return {
        status: "nothing",
        text: primary.message,
        externalSuggestions: [],
      };
    }
    if (primary.results.length) {
      return {
        status: "products",
        products: primary.results,
        matchTier: primary.matchTier,
        matchQuality: primary.matchQuality,
        query: term,
        // Attached by the resolve-item route, not here — this function
        // stays LLM-free (see its doc comment).
        recommendation: null,
      };
    }
    const cross = await searchStoresCore(
      { businessType: term, location },
      { buyerLocation, push },
    );
    if ("error" in cross) {
      return {
        status: "nothing",
        text: pickAvoiding(
          noVendorEvenBySectorPhrase(
            term,
            primary.externalSuggestions.length > 0,
            isService,
          ),
          [],
        ),
        externalSuggestions: primary.externalSuggestions,
      };
    }
    if (cross.results.length) {
      return {
        status: "offer",
        text: pickAvoiding(foundPossibleVendorPhrase(term, isService), []),
      };
    }
    const merged = Array.from(
      new Map(
        [...primary.externalSuggestions, ...cross.externalSuggestions].map(
          (b) => [b.placeId, b],
        ),
      ).values(),
    );
    return {
      status: "nothing",
      text: pickAvoiding(
        noVendorEvenBySectorPhrase(term, merged.length > 0, isService),
        [],
      ),
      externalSuggestions: merged,
    };
  }

  // item.type === "store"
  const primary = await searchStoresCore(
    { businessType: item.businessType, location },
    { buyerLocation, push },
  );
  if ("error" in primary) {
    return {
      status: "nothing",
      text: primary.message,
      externalSuggestions: [],
    };
  }
  if (primary.results.length) {
    return {
      status: "stores",
      stores: primary.results,
      furtherStores: primary.furtherResults,
      matchTier: primary.matchTier,
      matchQuality: primary.matchQuality,
      storesQuery: item.businessType,
    };
  }
  const cross = await searchProductsCore(
    { product: term, location },
    { buyerLocation, push },
  );
  if ("error" in cross) {
    return {
      status: "nothing",
      text: pickAvoiding(
        noVendorEvenBySectorPhrase(
          term,
          primary.externalSuggestions.length > 0,
          isService,
        ),
        [],
      ),
      externalSuggestions: primary.externalSuggestions,
    };
  }
  if (cross.results.length) {
    // A real LISTING matching the business type — confirmed, same
    // confidence as any other direct product find (see this file's own
    // doc comment).
    return {
      status: "products",
      products: cross.results,
      matchTier: cross.matchTier,
      matchQuality: cross.matchQuality,
      query: term,
      // Attached by the resolve-item route, not here — see above.
      recommendation: null,
    };
  }
  const merged = Array.from(
    new Map(
      [...primary.externalSuggestions, ...cross.externalSuggestions].map(
        (b) => [b.placeId, b],
      ),
    ).values(),
  );
  return {
    status: "nothing",
    text: pickAvoiding(
      noVendorEvenBySectorPhrase(term, merged.length > 0, isService),
      [],
    ),
    externalSuggestions: merged,
  };
}
