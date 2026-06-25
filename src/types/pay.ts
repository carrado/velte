// Types for the public pay page (src/app/pay/[linkId]) and its service.
// Mirrors the velte-backend payPage controller responses.

/** One variant line of an order (e.g. "Red ×3" within a 3-red-1-black order). */
export interface PayLinkOrderItem {
  /** Display label, e.g. "T-Shirt (Red)". */
  name: string | null;
  /** Variant text only, e.g. "Red, L" (null when the product has no variants). */
  variant: string | null;
  /** Units of this variant. */
  quantity: number;
  /** Per-unit price incl. modifier add-ons. */
  unitPrice: number | null;
  /** unitPrice × quantity. */
  lineTotal: number | null;
}

export interface PayLinkOrder {
  ref: string;
  product: string | null;
  /** Grand total (Σ line totals). */
  amount: number | null;
  /** Total units ordered (Σ line quantities). */
  quantity: number;
  /**
   * Per-variant breakdown. One entry for a plain order, several for a
   * multi-variant order. Empty for older orders placed before multi-variant
   * support — the page then falls back to the single product label + quantity.
   */
  items: PayLinkOrderItem[];
  customerName: string | null;
  paid: boolean;
}

export interface PayLinkData {
  linkId: string;
  accountName: string;
  bankName: string;
  description: string;
  amount: number | null; // null = open amount (payer enters it). The product price (X) the seller receives.
  amountFixed: boolean;
  currency: string; // "NGN"
  order: PayLinkOrder | null;
  // Commission breakdown computed by the backend (see docs/commission-fees.md).
  // Present when the amount is known (fixed/order links); null for open-amount
  // links where the buyer hasn't entered an amount yet.
  serviceFee: number | null; // C + F — bundled "Service fee" shown to the buyer
  total: number | null; // X + C + F — the amount actually charged
}

export interface InitializePayResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface InitializePayPayload {
  ref?: string;
  email?: string;
  amount?: number;
}
