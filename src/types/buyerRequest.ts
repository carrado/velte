export type BuyerRequestStatus =
  | "active"
  | "fulfilled"
  | "expired"
  | "cancelled";

export type BuyerRequestDecision = "accepted" | "declined";

export interface BuyerRequest {
  id: string;
  buyerId: string;
  buyerName: string;
  // Present only once THIS vendor has accepted — omitted by the backend
  // entirely before that (see vendorBuyerRequests.controller.js's
  // withGatedPhone), so its mere presence is the accept signal, no separate
  // flag needed to know whether to show it.
  buyerPhone?: string;
  description: string;
  imageUrl: string | null;
  // "N/A" on the vendor-facing detail page when this is absent — the buyer
  // simply didn't grant location for this request; there's no saved
  // location to fall back to (buyers don't have accounts).
  location?: { type: "Point"; coordinates: [number, number] } | null;
  status: BuyerRequestStatus;
  matchedVendorIds: string[];
  responseCount: number;
  lastResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  // This vendor's own decision on this request — null until they accept or
  // decline (see GET /api/vendor/buyer-requests and its /:id counterpart).
  myDecision: BuyerRequestDecision | null;
}
