import type {
  SearchStreamEvent,
  StoredSearchTurn,
  StoreMatch,
} from "@/types/search";

type FinalEvent = Extract<SearchStreamEvent, { type: "final" }>;

// A dual-intent query (e.g. "a phone repair shop that also sells chargers")
// can call both tools and return the same vendor in both lists — drop it
// from stores since its product card already names the vendor, rather than
// showing it twice with no link between the two cards. Extracted from
// SearchHome.tsx's onFinal (which now calls this) so the server-side turn
// persistence in /api/search/route.ts applies the IDENTICAL dedup — a
// rehydrated turn must render exactly what the live turn rendered.
export function dedupeFinalEventStores(event: FinalEvent): {
  stores: StoreMatch[];
  furtherStores: StoreMatch[];
  contextNote: string | null;
} {
  const productVendorIds = new Set(event.products.map((p) => p.vendorId));
  const stores = event.stores.filter((s) => !productVendorIds.has(s.vendorId));
  const furtherStores = event.furtherStores.filter(
    (s) => !productVendorIds.has(s.vendorId),
  );
  // A machine-only breadcrumb for a LATER turn's history — lets the model
  // resolve a future "what do they sell" back to this exact store via
  // getVendorProducts, without needing the buyer-facing reply text to ever
  // name the vendor (it deliberately doesn't). Includes productStores too
  // (guaranteed disjoint from the deduped stores by vendor) — a store
  // surfaced only via its matched product's own card should still resolve
  // the same way.
  const allStoresFound = [...stores, ...furtherStores, ...event.productStores];
  const contextNote = allStoresFound.length
    ? `[Stores found: ${allStoresFound
        .map((s) => `"${s.name}" (handle: ${s.handle})`)
        .join(", ")}]`
    : null;
  return { stores, furtherStores, contextNote };
}

/**
 * The persisted form of one completed /api/search turn (see
 * StoredSearchTurn) — built by route.ts right after emitting the final
 * event. `query`/`imageUrl` are the buyer's own side of the exchange, which
 * the event itself doesn't carry.
 */
export function buildTurnSnapshot(
  event: FinalEvent,
  query: string,
  imageUrl: string | null,
): StoredSearchTurn {
  const { stores, furtherStores, contextNote } = dedupeFinalEventStores(event);
  return {
    query,
    imageUrl,
    reply: event.reply,
    toolCalled: event.toolCalled,
    clarification: event.clarification,
    // Only ever set client-side, by resolve-item's own deterministic
    // clarify round — a route-persisted turn never has one.
    backgroundClarifyItem: null,
    products: event.products,
    weakProducts: event.weakProducts,
    stores,
    furtherStores,
    storesQuery: event.storesQuery,
    productStores: event.productStores,
    storeServices: event.storeServices,
    productsMatchTier: event.productsMatchTier,
    storesMatchTier: event.storesMatchTier,
    productsMatchQuality: event.productsMatchQuality,
    storesMatchQuality: event.storesMatchQuality,
    externalStoreSuggestions: event.externalStoreSuggestions,
    vendorProducts: event.vendorProducts,
    vendorProductsStore: event.vendorProductsStore,
    buyerRequestOffer: event.buyerRequestOffer,
    buyerRequestOffered: event.buyerRequestOffered,
    // route.ts never emits "reply" events (interim bubbles are a
    // client-side resolve-item concern) — always empty for a server-
    // persisted turn.
    interimReplies: [],
    awaitingBuyerRequestReply: event.awaitingBuyerRequestReply,
    buyerRequestMatchQuery: event.buyerRequestMatchQuery,
    contextNote,
    recommendation: event.recommendation,
    externalOffers: event.externalOffers,
  };
}
