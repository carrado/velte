import { api } from "@/lib/api-client";
import type { BuyerRequest } from "@/types/buyerRequest";

// The VENDOR's side of Buyer Requests — requests matched to the signed-in
// vendor (open ones plus their answered history), and one in detail. Vendor
// session (`api`), unlike services/buyerRequests.ts, which is the buyer's.
// Shared by the pages, the nav badge, the Products banner and the dashboard
// prefetch (prefetch-routes.ts), so every one of them caches the same shape
// under the same key.

export function fetchVendorBuyerRequests(): Promise<{
  requests: BuyerRequest[];
}> {
  return api.get<{ requests: BuyerRequest[] }>("/api/vendor/buyer-requests");
}

export function fetchVendorBuyerRequest(
  id: string,
): Promise<{ request: BuyerRequest }> {
  return api.get<{ request: BuyerRequest }>(
    `/api/vendor/buyer-requests/${encodeURIComponent(id)}`,
  );
}
