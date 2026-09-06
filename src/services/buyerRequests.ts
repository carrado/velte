import { buyerApi } from "@/lib/buyer-api-client";
import type { MyBuyerRequestList } from "@/types/buyerRequest";

// buyerApi, not `api`: this is a buyer-session endpoint, and api-client's
// global 401 handler would clear a VENDOR session and bounce to /auth/login
// (see buyer-api-client's own note). The route answers an empty list for an
// anonymous caller anyway, so a 401 here means a genuinely expired session.
export function fetchMyRequests(): Promise<MyBuyerRequestList> {
  return buyerApi.get<MyBuyerRequestList>("/api/buyer-requests/mine");
}
