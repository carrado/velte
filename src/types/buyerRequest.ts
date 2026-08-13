export type BuyerRequestStatus =
  "active" | "fulfilled" | "expired" | "cancelled";

export interface BuyerRequest {
  id: string;
  buyerId: string;
  description: string;
  imageUrl: string | null;
  area: string | null;
  state: string | null;
  status: BuyerRequestStatus;
  matchedVendorIds: string[];
  responseCount: number;
  lastResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  // Vendor-list-view only (see GET /api/vendor/buyer-requests) — absent on
  // the buyer-facing shape.
  alreadyResponded?: boolean;
}

export interface BuyerRequestResponseVendor {
  vendorId: string;
  name: string;
  whatsapp: string | null;
  handle: string | null;
}

export interface BuyerRequestResponseItem {
  id: string;
  requestId: string;
  vendorId: string;
  vendorResponse: string;
  createdAt: string;
  // Only populated on the buyer-facing GET /:id/responses — null/absent on
  // the vendor's own view of their response.
  vendor?: BuyerRequestResponseVendor | null;
}
