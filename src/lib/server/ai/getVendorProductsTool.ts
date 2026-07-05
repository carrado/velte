import { tool } from "ai";
import { z } from "zod";

import { backendData } from "@/lib/server/backend";
import type { StoreProductItem } from "@/types/search";

const inputSchema = z.object({
  storeHandle: z
    .string()
    .describe(
      "The exact `handle` of a store already found via searchStores earlier in THIS conversation (given to you in a bracketed context note). Never invent or guess a handle — if you don't have one, use searchStores or searchProducts instead.",
    ),
});

interface PublicStoreProduct {
  id: string;
  name: string;
  quoteOnRequest?: boolean;
  price: number;
  priceMax: number | null;
  currency: string;
  mainImageUrl: string | null;
}

interface PublicStoreResponse {
  handle: string;
  name: string;
  whatsapp: string | null;
  products: PublicStoreProduct[];
}

/**
 * Fetches ONE specific, already-identified vendor's own product listing —
 * for a buyer asking what's "inside" a store searchStores already
 * surfaced (e.g. "what do they sell", "show me their products"), rather
 * than a fresh nearby search that could return an entirely different
 * vendor's products. Reuses the existing public /store/:handle page's own
 * data endpoint (GET /store/by-handle/:handle) — no new backend route
 * needed. That endpoint returns raw kobo prices (same as every other
 * product source); divided by 100 here to match VendorMatch/StoreProductItem
 * convention.
 */
export function getVendorProductsTool(push?: (text: string) => void) {
  return tool({
    description:
      "Fetch a SPECIFIC vendor's own product/offering listings, by the store `handle` from a prior searchStores result — use this when the buyer wants to see what a particular store sells/has 'inside', after that store was already found. Do NOT use this to run a fresh general product search — that's searchProducts, and could return a completely different vendor's items instead of the one the buyer actually means.",
    inputSchema,
    execute: async ({ storeHandle }) => {
      push?.("Checking their catalog…");
      try {
        const store = await backendData<PublicStoreResponse>(
          `/store/by-handle/${encodeURIComponent(storeHandle)}`,
        );
        const results: StoreProductItem[] = store.products.map((p) => ({
          productId: p.id,
          name: p.name,
          price: p.price / 100,
          priceMax: p.priceMax != null ? p.priceMax / 100 : null,
          currency: p.currency,
          mainImageUrl: p.mainImageUrl,
          quoteOnRequest: Boolean(p.quoteOnRequest),
        }));
        return {
          results,
          store: {
            name: store.name,
            handle: store.handle,
            whatsapp: store.whatsapp,
          },
        };
      } catch {
        return {
          error: "store-not-found" as const,
          message: `Couldn't find a store with handle "${storeHandle}" — don't guess a handle; use searchStores again if you need to re-find it.`,
        };
      }
    },
  });
}
