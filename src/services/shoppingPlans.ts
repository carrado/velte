import { buyerApi } from "@/lib/buyer-api-client";
import type { ShoppingPlan, ShoppingPlanSummary } from "@/types/search";

// buyerApi, not `api` — same reasoning as fetchMyRequests: a buyer-session
// endpoint, and api-client's global 401 handler would clear a VENDOR
// session instead. Both routes answer an anonymous caller gracefully
// (empty list / 401 the page renders its own sign-in prompt for), so a real
// 401 here means a genuinely expired session.
export function fetchMyShoppingPlans(): Promise<{
  plans: ShoppingPlanSummary[];
}> {
  return buyerApi.get<{ plans: ShoppingPlanSummary[] }>(
    "/api/shopping-plan/mine",
  );
}

export function fetchShoppingPlan(id: string): Promise<{ plan: ShoppingPlan }> {
  return buyerApi.get<{ plan: ShoppingPlan }>(
    `/api/shopping-plan/${encodeURIComponent(id)}`,
  );
}
