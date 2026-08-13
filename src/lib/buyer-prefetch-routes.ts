import { buyerApi } from "@/lib/buyer-api-client";
import type { PrefetchTask } from "@/lib/prefetch-routes";
import type { Buyer } from "@/types/buyer";
import type {
  BuyerRequest,
  BuyerRequestResponseItem,
} from "@/types/buyerRequest";
import type { MarketplaceBrowseItem, VendorPreviewItem } from "@/types/store";

// The buyer dashboard's own route-key/prefetch-task map, mirroring
// prefetch-routes.ts's shape exactly but for /buyer/* instead of
// /[id]/*  — buyer routes have no per-user id segment to strip, so this
// stays a much simpler string match than getRouteKey's vendor version.
export function getBuyerRouteKey(href: string): string {
  return href.replace(/^\/buyer\/?/, "");
}

export function getBuyerPrefetchTasks(routeKey: string): PrefetchTask[] {
  // /buyer/requests/:id — dynamic, checked before the static switch below
  // can match it (same ordering as prefetch-routes.ts's own listing match).
  const requestMatch = routeKey.match(/^requests\/([^/]+)$/);
  if (requestMatch && requestMatch[1] !== "new") {
    const id = requestMatch[1];
    return [
      {
        queryKey: ["buyer-requests", id],
        queryFn: () =>
          buyerApi.get<{ request: BuyerRequest }>(`/api/buyer-requests/${id}`),
      },
      {
        queryKey: ["buyer-requests", id, "responses"],
        queryFn: () =>
          buyerApi.get<{ responses: BuyerRequestResponseItem[] }>(
            `/api/buyer-requests/${id}/responses`,
          ),
      },
    ];
  }

  const myProfileTask = {
    queryKey: ["buyer", "me"],
    queryFn: () => buyerApi.get<{ buyer: Buyer }>("/api/buyer-auth/me"),
  };
  const myRequestsTask = {
    queryKey: ["buyer-requests", "my"],
    queryFn: () =>
      buyerApi.get<{ requests: BuyerRequest[] }>("/api/buyer-requests/my"),
  };

  switch (routeKey) {
    case "":
      // Home's hero greeting reads buyer/me, its Active Requests section
      // reads buyer-requests/my — prefetching both means neither flashes a
      // loading skeleton for a buyer who was already verified.
      return [myProfileTask, myRequestsTask];
    case "profile":
      // Both the identity card and the Requests/Saved stat tiles read
      // these — see Profile page's own comment.
      return [myProfileTask, myRequestsTask];
    case "requests":
      return [myRequestsTask];
    case "saved":
      return [
        {
          queryKey: ["buyer-saved", "my"],
          queryFn: () =>
            buyerApi.get<{
              products: MarketplaceBrowseItem[];
              vendors: VendorPreviewItem[];
            }>("/api/buyer-saved/my"),
        },
      ];
    default:
      // "requests/new" and anything unrecognized — no data to prefetch,
      // same "just show the bar and land instantly" behavior
      // prefetch-routes.ts's own default case gives vendor routes like it.
      return [];
  }
}

/** Buyer hrefs are always absolute already (no per-user id prefix to
 *  resolve) — this exists purely so the shared factory has a normalizer to
 *  call, matching normalizeDashboardHref's signature. */
export function normalizeBuyerHref(href: string): string {
  return href;
}
