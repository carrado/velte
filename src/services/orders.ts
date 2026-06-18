import { apiClient } from "@/lib/api";
import type {
  OrderStatus,
  OrderFilter,
  Order,
  OrderStats,
  OrderListParams,
  OrderListResult,
  OrderDetail,
  PaymentStatus,
} from "@/types/order";

export type { OrderStatus, OrderFilter, Order, OrderStats };
export type { PaymentStatus } from "@/types/order";
export type { OrderListParams, OrderListResult, OrderDetail };

// ── API response shapes ─────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Canonical lifecycle status as stored on the backend (snake_case). */
type ApiOrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "on_the_way"
  | "shipped"
  | "delivered"
  | "cancelled";

interface ApiOrder {
  id: string;
  /** Display reference, e.g. "#ORD0001" */
  reference: string;
  product_name: string;
  /** Product photo URL (snapshot at order time); null when unavailable */
  product_image: string | null;
  product_initials: string | null;
  /** Tailwind avatar classes, e.g. "bg-blue-100 text-blue-600" */
  product_color: string | null;
  /** Grand total in kobo (NGN) */
  total_amount: number;
  payment_status: "paid" | "unpaid";
  status: ApiOrderStatus;
  created_at: string;
}

interface ApiOrderDetail extends ApiOrder {
  quantity: number;
  /** Unit price in kobo */
  unit_price: number;
  /** Sum of line items in kobo (before delivery fee) */
  subtotal: number;
  /** Delivery / shipping fee in kobo */
  delivery_fee: number;
  payment_method: string | null;
  sku: string | null;
  notes: string | null;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  fulfillment_type: "delivery" | "pickup";
  delivery_address: string | null;
  carrier: string | null;
  estimated_delivery: string | null;
  estimated_prep_mins: number | null;
  updated_at: string;
}

interface ApiOrderStats {
  total_orders: { value: number; growth: number };
  new_orders: { value: number; growth: number };
  completed_orders: { value: number; percentage: number };
  canceled_orders: { value: number; growth: number };
}

// ── Status mapping ──────────────────────────────────────────────────────────────

const STATUS_FROM_API: Record<ApiOrderStatus, OrderStatus> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  on_the_way: "OnTheWay",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TO_API: Record<OrderStatus, ApiOrderStatus> = {
  Pending: "pending",
  Preparing: "preparing",
  Ready: "ready",
  OnTheWay: "on_the_way",
  Shipped: "shipped",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_AVATAR = "bg-gray-100 text-gray-600";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Format an ISO timestamp to the DD-MM-YYYY string the UI renders. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapOrder(o: ApiOrder): Order {
  const payment: PaymentStatus =
    o.payment_status === "paid" ? "Paid" : "Unpaid";
  return {
    id: o.id,
    orderId: o.reference,
    product: {
      name: o.product_name,
      initials: o.product_initials ?? initialsFrom(o.product_name),
      color: o.product_color ?? DEFAULT_AVATAR,
      image: o.product_image ?? null,
    },
    date: formatDate(o.created_at),
    price: o.total_amount / 100,
    payment,
    status: STATUS_FROM_API[o.status] ?? "Pending",
  };
}

function mapOrderDetail(o: ApiOrderDetail): OrderDetail {
  return {
    ...mapOrder(o),
    quantity: o.quantity,
    unitPrice: o.unit_price / 100,
    subtotal: o.subtotal / 100,
    deliveryFee: o.delivery_fee / 100,
    total: o.total_amount / 100,
    paymentMethod: o.payment_method ?? "—",
    sku: o.sku,
    notes: o.notes,
    customer: {
      name: o.customer.name,
      phone: o.customer.phone,
      email: o.customer.email,
      address: o.customer.address,
    },
    fulfillment: {
      type: o.fulfillment_type,
      address: o.delivery_address,
      carrier: o.carrier,
      estimate: o.estimated_delivery,
      estimatedPrepMins: o.estimated_prep_mins,
    },
    placedAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchOrders(
  params: OrderListParams = {},
): Promise<OrderListResult> {
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

  const query = qs.toString() ? `?${qs}` : "";
  const res = await apiClient<
    ApiResponse<{
      orders: ApiOrder[];
      pagination: OrderListResult["pagination"];
    }>
  >(`/orders${query}`);

  return {
    orders: res.data.orders.map(mapOrder),
    pagination: res.data.pagination,
  };
}

export async function fetchOrderStats(): Promise<OrderStats> {
  const res = await apiClient<ApiResponse<ApiOrderStats>>("/orders/stats");
  const s = res.data;
  return {
    totalOrders: s.total_orders,
    newOrders: s.new_orders,
    completedOrders: s.completed_orders,
    canceledOrders: s.canceled_orders,
  };
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const res = await apiClient<ApiResponse<ApiOrderDetail>>(`/orders/${id}`);
  return mapOrderDetail(res.data);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const res = await apiClient<ApiResponse<ApiOrder>>(`/orders/${id}/status`, {
    method: "PATCH",
    data: { status: STATUS_TO_API[status] },
  });
  return mapOrder(res.data);
}
