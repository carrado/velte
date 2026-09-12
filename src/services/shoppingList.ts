import { buyerApi } from "@/lib/buyer-api-client";
import type {
  ShoppingListJob,
  ShoppingListJobSummary,
} from "@/types/shoppingList";

// buyerApi, not `api` — same reasoning as buyerRequests.ts's own comment:
// this is a buyer-session endpoint, and api-client's global 401 handler
// would otherwise bounce a signed-in VENDOR viewing /chat out to
// /auth/login.

/** "My Shopping Lists" (spec §20) — every job this buyer has started. */
export function fetchShoppingListJobs(): Promise<{
  jobs: ShoppingListJobSummary[];
}> {
  return buyerApi.get<{ jobs: ShoppingListJobSummary[] }>("/api/shopping-list");
}

export function fetchShoppingListJob(
  jobId: string,
): Promise<{ job: ShoppingListJob }> {
  return buyerApi.get<{ job: ShoppingListJob }>(`/api/shopping-list/${jobId}`);
}

export function selectBestForShoppingListJob(
  jobId: string,
): Promise<{ job: ShoppingListJob }> {
  return buyerApi.post<{ job: ShoppingListJob }>(
    `/api/shopping-list/${jobId}/recommend`,
  );
}
