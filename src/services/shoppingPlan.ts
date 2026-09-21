import { buyerApi } from "@/lib/buyer-api-client";
import type {
  ShoppingPlan,
  ShoppingPlanRecommendations,
  ShoppingPlanSummary,
} from "@/types/shoppingPlan";

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

/** The detail page's "Top pick" layer (2026-09-21) — fetched separately
 *  from the plan itself so a slower LLM call never delays showing the
 *  plan's own already-fresh data. See the route's own header for why this
 *  is computed on view rather than during the background sweep. */
export function fetchShoppingPlanRecommendations(
  planId: string,
): Promise<{ recommendations: ShoppingPlanRecommendations }> {
  return buyerApi.get<{ recommendations: ShoppingPlanRecommendations }>(
    `/api/shopping-plan/${planId}/recommendations`,
  );
}

// selectShoppingPlanItemCandidate/dismissShoppingPlanAlternative removed
// 2026-09-20 (explicit product decision, along with their backend
// endpoints and `selectedCandidateId`/`suggestedAlternativeCandidateId`
// themselves) — see types/shoppingPlan.ts's own comment on
// ShoppingPlanCandidate.purchased for the reasoning.

/** Per-candidate, not per-item (2026-09-20) — see this file's own removed
 *  functions above for why there's no longer a standing selection to
 *  purchase. */
export function markShoppingPlanItemPurchased(
  planId: string,
  itemId: string,
  candidateId: string,
  purchased: boolean,
): Promise<{ plan: ShoppingPlan }> {
  return buyerApi.patch<{ plan: ShoppingPlan }>(
    `/api/shopping-plan/${planId}/items/${itemId}/purchase`,
    { candidateId, purchased },
  );
}
