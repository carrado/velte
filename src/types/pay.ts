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
  amount: number | null; // null = open amount (payer enters it)
  amountFixed: boolean;
  currency: string; // "NGN"
  order: PayLinkOrder | null;
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
