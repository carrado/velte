// Types for the public pay page (src/app/pay/[linkId]) and its service.
// Mirrors the velte-backend payPage controller responses.

export interface PayLinkOrder {
  ref: string;
  product: string | null;
  amount: number | null;
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
