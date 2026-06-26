import { api } from "@/lib/api-client";
import type {
  OrderStatus,
  OrderFilter,
  Order,
  OrderStats,
  OrderListParams,
  OrdersPage,
  OrderDetail,
} from "@/types/order";

export type { OrderStatus, OrderFilter, Order, OrderStats };
export type { PaymentStatus } from "@/types/order";
export type { OrderListParams, OrdersPage, OrderDetail };

function buildQuery(params: OrderListParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.tab && params.tab !== "all") qs.set("tab", params.tab);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.payment_status) qs.set("payment_status", params.payment_status);
  if (params.start_date) qs.set("start_date", params.start_date);
  if (params.end_date) qs.set("end_date", params.end_date);
  if (params.sort_by) qs.set("sort_by", params.sort_by);
  if (params.sort_order) qs.set("sort_order", params.sort_order);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function fetchOrders(
  params: OrderListParams = {},
): Promise<OrdersPage> {
  return api.get<OrdersPage>(`/api/orders${buildQuery(params)}`);
}

export async function fetchOrderStats(): Promise<OrderStats> {
  const { stats } = await api.get<{ stats: OrderStats }>("/api/orders/stats");
  return stats;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { order } = await api.get<{ order: OrderDetail }>(`/api/orders/${id}`);
  return order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const { order } = await api.patch<{ order: Order }>(
    `/api/orders/${id}/status`,
    { status },
  );
  return order;
}

// Vendor confirms a held manual-transfer payment (payment === "Awaiting").
export async function confirmOrderPayment(id: string): Promise<Order> {
  const { order } = await api.patch<{ order: Order }>(
    `/api/orders/${id}/confirm-payment`,
  );
  return order;
}

// Vendor rejects a held manual-transfer payment (couldn't find the transfer).
export async function rejectOrderPayment(id: string): Promise<Order> {
  const { order } = await api.patch<{ order: Order }>(
    `/api/orders/${id}/reject-payment`,
  );
  return order;
}

// Fetch the buyer's uploaded receipt as a data URL for the vendor to review.
export async function getOrderReceiptImage(id: string): Promise<string> {
  const { image } = await api.get<{ image: string }>(
    `/api/orders/${id}/receipt-image`,
  );
  return image;
}
