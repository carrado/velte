import { searchProductsCore } from "@/lib/server/ai/searchProductsTool";
import { searchStoresCore } from "@/lib/server/ai/searchStoresTool";
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
    ? [item.product, ...(item.attributes ?? [])].join(" ")
    : item.businessType;
}

/**
 * Resolves ONE named item to completion: run its own search (products for a
 * "product" item, stores for a "store" item), and if that comes back empty,
 * cross-check the OTHER index with the same term — the exact technique
 * route.ts's own unified dead-end handler uses (see that file's comment on
 * why a cross-index check, not a wider radius, is what actually finds
 * something new). A real product/service LISTING found via the cross-check
 * is treated as a confirmed match ("products"); a store found only by
 * sector/description is unconfirmed, so it becomes an "offer" instead of a
 * plain result. No LLM call anywhere in here — fully deterministic, cheap
 * enough to run from a background fetch with no buyer-visible cost beyond
 * the network round trip.
 */
export async function resolveSearchItem(
  item: SearchItemInput,
  location: string | undefined,
  buyerLocation: BuyerLocation | undefined,
  push?: (candidates: string[]) => void,
): Promise<SearchItemOutcome> {
  const term = searchItemTerm(item);

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
          noVendorEvenBySectorPhrase(primary.externalSuggestions.length > 0),
          [],
        ),
        externalSuggestions: primary.externalSuggestions,
      };
    }
    if (cross.results.length) {
      return {
        status: "offer",
        text: pickAvoiding(foundPossibleVendorPhrase(term), []),
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
      text: pickAvoiding(noVendorEvenBySectorPhrase(merged.length > 0), []),
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
        noVendorEvenBySectorPhrase(primary.externalSuggestions.length > 0),
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
    text: pickAvoiding(noVendorEvenBySectorPhrase(merged.length > 0), []),
    externalSuggestions: merged,
  };
}
