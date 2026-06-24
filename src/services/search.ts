import { api } from "@/lib/api-client";
import type {
  RawSearchResponse,
  SearchParams,
  SearchResultsByType,
} from "@/types/search";

const STATUS_BADGE = {
  Delivered: "success",
  Pending: "warning",
  Shipped: "info",
  Cancelled: "error",
  Complete: "success",
  Canceled: "error",
  Active: "success",
  Inactive: "neutral",
  VIP: "purple",
  Paid: "success",
  Unpaid: "warning",
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export const searchService = {
  async search(
    params: SearchParams,
    userId: string,
  ): Promise<SearchResultsByType> {
    const qs = new URLSearchParams({ q: params.q });
    if (params.limit) qs.set("limit", String(params.limit));

    const { orders, products, customers, transactions, categories } =
      await api.get<RawSearchResponse["data"]>(`/api/search?${qs.toString()}`);

    return {
      orders: orders.map((o) => ({
        type: "order",
        id: o.id,
        title: `${o.orderId} — ${o.productName}`,
        subtitle: `₦${o.price.toLocaleString()} · ${fmtDate(o.date)}`,
        badge: o.status,
        badgeVariant: STATUS_BADGE[o.status],
        href: `/${userId}/orders/${o.id}`,
      })),

      products: products.map((p) => ({
        type: "product",
        id: p.id,
        title: p.name,
        subtitle: `${p.categoryName} · ₦${p.price.toLocaleString()}`,
        badge:
          p.inStock === 0
            ? "Out of Stock"
            : p.inStock <= 5
              ? "Low Stock"
              : "In Stock",
        badgeVariant:
          p.inStock === 0 ? "error" : p.inStock <= 5 ? "warning" : "success",
        href: `/${userId}/products/${p.id}`,
      })),

      customers: customers.map((c) => ({
        type: "customer",
        id: c.id,
        title: c.name,
        subtitle: c.phone,
        badge: c.status,
        badgeVariant: STATUS_BADGE[c.status],
        href: `/${userId}/customers`,
      })),

      transactions: transactions.map((t) => ({
        type: "transaction",
        id: t.id,
        title: t.name,
        subtitle: `${t.total} · ${fmtDate(t.date)}`,
        badge: t.status,
        badgeVariant: STATUS_BADGE[t.status],
        href: `/${userId}/transactions`,
      })),

      categories: categories.map((cat) => ({
        type: "category",
        id: cat.id,
        title: cat.name,
        subtitle:
          cat.productCount != null ? `${cat.productCount} products` : undefined,
        href: `/${userId}/products`,
      })),
    };
  },
};
