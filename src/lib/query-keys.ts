import type { ProductListParams } from "@/types/product";
import type { WalletTransactionsParams } from "@/types/wallet";

export const queryKeys = {
  products: {
    categories: ["products", "categories"] as const,
    list: (params?: ProductListParams) =>
      ["products", "list", params ?? {}] as const,
    detail: (id: string) => ["products", "detail", id] as const,
    stats: (filter: "all" | "in-stock" | "out-of-stock" | "featured") =>
      ["products", "stats", filter] as const,
  },
  settings: {
    profile: ["settings", "profile"] as const,
  },
  store: {
    mine: ["store", "mine"] as const,
  },
  wallet: {
    detail: ["wallet", "detail"] as const,
    stats: (months?: number) => ["wallet", "stats", months ?? 6] as const,
    transactions: (params?: WalletTransactionsParams) =>
      ["wallet", "transactions", params ?? {}] as const,
  },
};
