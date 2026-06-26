import { backendFetch } from "./backend";
import type {
  Order,
  OrderDetail,
  OrderStats,
  OrderStatus,
  OrdersPage,
  PaymentStatus,
} from "@/types/order";

/* Server data module for orders. Calls the upstream backend and maps its
   snake_case / kobo shapes into the camelCase / naira domain objects the UI
   consumes, so route handlers stay thin and return clean payloads. */

// ── Upstream shapes ──────────────────────────────────────────────────────────

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
  reference: string;
  product_name: string;
  product_image: string | null;
  product_initials: string | null;
  product_color: string | null;
  total_amount: number; // kobo
  payment_status: "paid" | "unpaid" | "awaiting_confirmation";
  status: ApiOrderStatus;
  created_at: string;
}

interface ApiOrderDetail extends ApiOrder {
  quantity: number;
  unit_price: number;
  subtotal: number;
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

interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Upstream envelope. The backend wraps payloads as `{ success, data }`. */
interface Wrapped<T> {
  data: T;
}

// ── Status mapping ───────────────────────────────────────────────────────────

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

// ── Helpers / mappers ────────────────────────────────────────────────────────

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
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function mapOrder(o: ApiOrder): Order {
  const payment: PaymentStatus =
    o.payment_status === "paid"
      ? "Paid"
      : o.payment_status === "awaiting_confirmation"
        ? "Awaiting"
        : "Unpaid";
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

// ── Data functions ───────────────────────────────────────────────────────────

/** A page of orders for the given filters (search params forwarded upstream). */
export async function listOrders(
  search: URLSearchParams,
  cookie: string,
): Promise<OrdersPage> {
  const qs = search.toString();
  const { data } = await backendFetch<
    Wrapped<{ orders: ApiOrder[]; pagination: ApiPagination }>
  >(`/orders${qs ? `?${qs}` : ""}`, { cookie });

  return {
    orders: data.orders.map(mapOrder),
    pageInfo: {
      page: data.pagination.page,
      totalPages: data.pagination.total_pages,
      total: data.pagination.total,
    },
  };
}

export async function getOrderDetail(
  id: string,
  cookie: string,
): Promise<OrderDetail> {
  const { data } = await backendFetch<Wrapped<ApiOrderDetail>>(
    `/orders/${id}`,
    {
      cookie,
    },
  );
  return mapOrderDetail(data);
}

export async function getOrderStats(cookie: string): Promise<OrderStats> {
  const { data } = await backendFetch<Wrapped<ApiOrderStats>>("/orders/stats", {
    cookie,
  });
  return {
    totalOrders: data.total_orders,
    newOrders: data.new_orders,
    completedOrders: data.completed_orders,
    canceledOrders: data.canceled_orders,
  };
}

export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  cookie: string,
): Promise<Order> {
  const { data } = await backendFetch<Wrapped<ApiOrder>>(
    `/orders/${id}/status`,
    { method: "PATCH", body: { status: STATUS_TO_API[status] }, cookie },
  );
  return mapOrder(data);
}

// Vendor confirms a held manual-transfer payment (paymentStatus awaiting_confirmation).
export async function confirmOrderPayment(
  id: string,
  cookie: string,
): Promise<Order> {
  const { data } = await backendFetch<Wrapped<ApiOrder>>(
    `/orders/${id}/confirm-payment`,
    { method: "PATCH", cookie },
  );
  return mapOrder(data);
}

// Vendor rejects a held manual-transfer payment (couldn't find the transfer).
export async function rejectOrderPayment(
  id: string,
  cookie: string,
): Promise<Order> {
  const { data } = await backendFetch<Wrapped<ApiOrder>>(
    `/orders/${id}/reject-payment`,
    { method: "PATCH", cookie },
  );
  return mapOrder(data);
}

// Fetch the buyer's uploaded receipt (proxied from staffly) as a data URL so the
// vendor can review it before confirming.
export async function getOrderReceiptImage(
  id: string,
  cookie: string,
): Promise<string> {
  const { data } = await backendFetch<Wrapped<{ image: string }>>(
    `/orders/${id}/receipt-image`,
    { method: "GET", cookie },
  );
  return data.image;
}

/** Domain status values accepted from clients (for request validation). */
export const ORDER_STATUSES = Object.keys(STATUS_TO_API) as OrderStatus[];
