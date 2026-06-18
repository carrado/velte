import type { ReactNode } from "react";

export type RetailOrderStatus =
  | "Delivered"
  | "Pending"
  | "Shipped"
  | "Cancelled";
export type FoodOrderStatus =
  | "Pending"
  | "Preparing"
  | "Ready"
  | "OnTheWay"
  | "Delivered"
  | "Cancelled";
export type OrderStatus = RetailOrderStatus | FoodOrderStatus;
export type PaymentStatus = "Paid" | "Unpaid";
export type OrderFilter = "all" | "completed" | "pending" | "cancelled";

export interface Order {
  id: string;
  orderId: string;
  product: {
    name: string;
    initials: string;
    color: string;
    image?: string | null;
  };
  date: string;
  price: number;
  payment: PaymentStatus;
  status: OrderStatus;
}

export interface OrderStats {
  totalOrders: { value: number; growth: number };
  newOrders: { value: number; growth: number };
  completedOrders: { value: number; percentage: number };
  canceledOrders: { value: number; growth: number };
}

export interface FilterState {
  startDate: string;
  endDate: string;
  paymentStatus: "all" | "Paid" | "Unpaid";
  orderStatus: OrderFilter;
}

export type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";

// ── Server-side list params + result ───────────────────────────────────────────

export interface OrderListParams {
  page?: number;
  limit?: number;
  /** Status tab — maps to the order lifecycle on the backend */
  tab?: OrderFilter;
  /** Case-insensitive match against order reference or product name */
  search?: string;
  payment_status?: "paid" | "unpaid";
  /** ISO date (YYYY-MM-DD) — inclusive lower bound on created_at */
  start_date?: string;
  /** ISO date (YYYY-MM-DD) — inclusive upper bound on created_at */
  end_date?: string;
  sort_by?: "created_at" | "price";
  sort_order?: "asc" | "desc";
}

export interface OrderListResult {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// ── Order detail ────────────────────────────────────────────────────────────────

export interface OrderCustomer {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface OrderFulfillment {
  type: "delivery" | "pickup";
  address?: string | null;
  /** Retail: shipping carrier name */
  carrier?: string | null;
  /** Retail: human-readable delivery estimate, e.g. "3 – 5 business days" */
  estimate?: string | null;
  /** Food: kitchen prep estimate in minutes */
  estimatedPrepMins?: number | null;
}

export interface OrderDetail extends Order {
  /** Quantity of the product ordered */
  quantity: number;
  /** Unit price in NGN */
  unitPrice: number;
  /** Sum of line items in NGN (before delivery fee) */
  subtotal: number;
  /** Delivery / shipping fee in NGN */
  deliveryFee: number;
  /** Grand total in NGN (matches `price` on the list row) */
  total: number;
  /** Human-readable payment method, e.g. "Credit / Debit Card" */
  paymentMethod: string;
  /** Product SKU (retail) or menu code (food) */
  sku?: string | null;
  /** Free-form customer note */
  notes?: string | null;
  customer: OrderCustomer;
  fulfillment: OrderFulfillment;
  /** ISO timestamp the order was placed */
  placedAt: string;
  /** ISO timestamp of the last status change */
  updatedAt: string;
}

export interface OrderRowMenuAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  highlight?: boolean;
}

export interface SettingsData {
  minDurationDays: number;
  maxDurationDays: number;
  deliveryType: "bulk" | "single";
  paymentMethod: string;
}
