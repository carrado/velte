import type { FetchTransactionsParams } from "@/types/transaction";
import type { OrderFilter } from "@/types/order";
import type { ProductListParams } from "@/types/product";

export { DEFAULT_TRANSACTIONS_LIST_PARAMS } from "@/lib/transaction-list-params";

export const queryKeys = {
  dashboard: {
    stats: ["dashboardStats"] as const,
    bestSelling: ["bestSelling"] as const,
    monthlySales: ["monthlySales"] as const,
    topProducts: ["topProducts"] as const,
    transactions: ["transactions"] as const,
    usersActivity: ["usersActivity"] as const,
    weeklyReport: (period: string) => ["weeklyReport", period] as const,
    addableProducts: ["addableProducts"] as const,
  },
  orders: {
    stats: ["orderStats"] as const,
    list: (tab: OrderFilter) => ["orders", tab] as const,
  },
  products: {
    categories: ["products", "categories"] as const,
    list: (params?: ProductListParams) =>
      ["products", "list", params ?? {}] as const,
    detail: (id: string) => ["products", "detail", id] as const,
    stats: (filter: "all" | "in-stock" | "out-of-stock" | "featured") =>
      ["products", "stats", filter] as const,
  },
  customers: {
    list: ["customers", "list"] as const,
  },
  transactions: {
    all: ["transactions", "list"] as const,
    list: (params: FetchTransactionsParams) =>
      ["transactions", "list", params] as const,
  },
  subscription: {
    status: ["subscription", "status"] as const,
  },
  aiSetup: {
    status: ["aiSetup", "status"] as const,
  },
  settings: {
    profile: ["settings", "profile"] as const,
    notifications: ["settings", "notifications"] as const,
    whatsappProfile: ["settings", "whatsappProfile"] as const,
  },
  search: {
    results: (q: string) => ["search", "results", q] as const,
  },
};
