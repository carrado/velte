export interface CartLineOption {
  group: string;
  option: string;
}

export interface CartLine {
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  imageUrl: string | null;
  /** Listed unit price in naira. */
  unitPrice: number;
  quantity: number;
  options?: CartLineOption[];
}

export interface CartMissingOption {
  groupId: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: { optionId: string; name: string; additionalPrice: number }[];
}

export type CartAddOutcome =
  | {
      status: "ok";
      line: CartLine;
    }
  | {
      status: "needs_signin";
      productId: string;
      quantity: number;
      name: string;
      vendorId: string;
      vendorName: string;
      imageUrl: string | null;
      unitPrice: number | null;
    }
  | {
      status: "needs_options";
      productId: string;
      quantity: number;
      name: string;
      vendorId: string;
      vendorName: string;
      imageUrl: string | null;
      unitPrice: number;
      missing: CartMissingOption[];
    }
  | {
      status: "vendor_mismatch";
      currentVendorName: string;
      line: CartLine;
    }
  | { status: "ineligible"; reason: string }
  | { status: "not_shown"; reason: string }
  | { status: "external"; reason: string };

export interface CartQuoteItem {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
}

export interface CartQuote {
  vendorId: string;
  items: CartQuoteItem[];
  subtotalKobo: number;
  commissionKobo: number;
  paystackFeeKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "accepted"
  | "dispatched"
  | "delivered"
  | "received"
  | "disputed"
  | "confirmed"
  | "cancelled"
  | "refunded";

export type OrderSettlement =
  | "none"
  | "escrowed"
  | "frozen"
  | "releasing"
  | "released"
  | "refunding"
  | "refunded"
  | "failed";

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
}

export interface OrderFulfillment {
  name: string;
  phone: string;
  address: string;
}

export interface CartOrder {
  id: string;
  buyerId: string;
  vendorId: string;
  vendorName: string | null;
  storeHandle: string | null;
  items: OrderItem[];
  subtotalKobo: number;
  commissionKobo: number;
  paystackFeeKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  status: OrderStatus;
  settlement?: OrderSettlement;
  paystackReference: string;
  paidAt: string | null;
  acceptedAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  confirmBy?: string | null;
  receivedAt?: string | null;
  confirmedAt: string | null;
  pickupCode?: string | null;
  createdAt: string;
  fulfillment: OrderFulfillment | null;
}

export interface CartCheckoutResult {
  authorizationUrl: string;
  reference: string;
  order: CartOrder;
}
