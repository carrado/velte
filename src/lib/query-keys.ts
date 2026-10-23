import type { ProductListParams } from "@/types/product";
import type { WalletTransactionsParams } from "@/types/wallet";

export const queryKeys = {
  products: {
    categories: ["products", "categories"] as const,
    list: (params?: ProductListParams) =>
      ["products", "list", params ?? {}] as const,
    detail: (id: string) => ["products", "detail", id] as const,
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
  cart: {
    quote: (vendorId: string, fingerprint: string) =>
      ["cart", "quote", vendorId, fingerprint] as const,
    buyerOrders: ["cart", "buyer-orders"] as const,
  },
  vendorOrders: {
    list: (status?: string) => ["vendor-orders", status ?? "all"] as const,
    detail: (id: string) => ["vendor-orders", "detail", id] as const,
  },
  payouts: {
    account: ["payouts", "account"] as const,
    banks: ["payouts", "banks"] as const,
    // Keyed by the pair being looked up, so correcting a typo back to a
    // number already checked is answered from cache rather than re-asking
    // the bank.
    resolve: (bankCode: string, accountNumber: string) =>
      ["payouts", "resolve", bankCode, accountNumber] as const,
  },
  notifications: {
    list: ["notifications", "list"] as const,
  },
  referrals: {
    mine: ["referrals", "mine"] as const,
  },
  // The vendor's matched Buyer Requests. Detail nests under the list key on
  // purpose: invalidating the list (after accept/decline) refreshes the
  // detail too, and the nav badge + Products banner share the list entry.
  hub: {
    home: (scope: "buyer" | "vendor" | "open") =>
      ["hub", "home", 2, scope] as const,
    context: ["hub", "context"] as const,
    adverts: ["hub", "adverts"] as const,
  },
  vendorBuyerRequests: {
    list: ["vendor-buyer-requests"] as const,
    detail: (id: string) => ["vendor-buyer-requests", id] as const,
  },
};
