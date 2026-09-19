import { buyerApi } from "@/lib/buyer-api-client";
import type { ShoppingPlan, ShoppingPlanSummary } from "@/types/shoppingPlan";

// buyerApi, not `api` — same reasoning as buyerRequests.ts's own comment:
// this is a buyer-session endpoint, and api-client's global 401 handler
// would otherwise bounce a signed-in VENDOR viewing /chat out to
// /auth/login.

/** The Shopping Plans index page's own data source. */
export function fetchShoppingPlans(): Promise<{
  plans: ShoppingPlanSummary[];
}> {
  return buyerApi.get<{ plans: ShoppingPlanSummary[] }>("/api/shopping-plan");
}

export function fetchShoppingPlan(
  planId: string,
): Promise<{ plan: ShoppingPlan }> {
  return buyerApi.get<{ plan: ShoppingPlan }>(`/api/shopping-plan/${planId}`);
}

export function selectShoppingPlanItemCandidate(
  planId: string,
  itemId: string,
  candidateId: string | null,
): Promise<{ plan: ShoppingPlan }> {
  return buyerApi.patch<{ plan: ShoppingPlan }>(
    `/api/shopping-plan/${planId}/items/${itemId}/select`,
    { candidateId },
  );
}

/** Declines a suggested alternative (spec §20) — the other half of
 *  approval, alongside selecting it via selectShoppingPlanItemCandidate. */
export function dismissShoppingPlanAlternative(
  planId: string,
  itemId: string,
): Promise<{ plan: ShoppingPlan }> {
  return buyerApi.patch<{ plan: ShoppingPlan }>(
    `/api/shopping-plan/${planId}/items/${itemId}/dismiss-alternative`,
    {},
  );
}

export function markShoppingPlanItemPurchased(
  planId: string,
  itemId: string,
  purchased: boolean,
): Promise<{ plan: ShoppingPlan }> {
  return buyerApi.patch<{ plan: ShoppingPlan }>(
    `/api/shopping-plan/${planId}/items/${itemId}/purchase`,
    { purchased },
  );
}
