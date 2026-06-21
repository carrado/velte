// Types for the public customer order-tracking page (src/app/track/[token])
// and its service. Mirrors the velte-backend trackOrder controller responses.
//
// This is the public-safe subset of an order — it deliberately omits sensitive
// vendor/customer fields (phone, email, full address unless needed for pickup).

import type { OrderStatus, PaymentStatus } from "@/types/order";

export type TrackBusinessType = "retail" | "food";

export interface TrackProduct {
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
}

export interface TrackFulfillment {
  type: "delivery" | "pickup";
  address: string | null;
  /** Retail: shipping carrier name */
  carrier: string | null;
  /** Retail: human-readable delivery estimate, e.g. "3 – 5 business days" */
  estimate: string | null;
  /** Food: kitchen prep estimate in minutes */
  estimatedPrepMins: number | null;
}

export interface TrackOrderData {
  token: string;
  /** Human-readable order reference, e.g. "ORD-1234" */
  orderRef: string;
  /** Vendor / business name the customer ordered from */
  storeName: string;
  businessType: TrackBusinessType;
  status: OrderStatus;
  payment: PaymentStatus;
  customerName: string | null;
  product: TrackProduct;
  /** Grand total in the given currency */
  total: number;
  currency: string; // "NGN"
  /** ISO timestamp the order was placed */
  placedAt: string;
  /** ISO timestamp of the last status change */
  updatedAt: string;
  fulfillment: TrackFulfillment;
}

export interface TrackKeyPayload {
  key: string;
}
