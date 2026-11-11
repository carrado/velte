import type { QueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/services/products";
import { settingsApi } from "@/services/settings";
import { walletApi } from "@/services/wallet";
import { fetchMyReferrals } from "@/services/referrals";
import { storeApi } from "@/services/store";
import { vendorOrdersApi } from "@/services/cart";
import { fetchNotifications } from "@/services/notifications";
import {
  fetchVendorBuyerRequest,
  fetchVendorBuyerRequests,
} from "@/services/vendorBuyerRequests";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchHubAdverts,
  fetchHubAnalytics,
  fetchHubBoosts,
  fetchHubCommunity,
  fetchHubContext,
  fetchHubHome,
  fetchHubVendors,
} from "@/services/hub";
import { getErrorMessage } from "@/lib/error-message";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

export type PrefetchTask = {
  queryKey: readonly unknown[];
  queryFn: (ctx?: { pageParam?: unknown }) => Promise<unknown>;
  /** When set, the task is prefetched as an infinite query (first page only). */
  infinite?: {
    initialPageParam: unknown;
    getNextPageParam: (lastPage: unknown) => unknown;
  };
};

export function getRouteKey(href: string): string {
  const clean = href.split("?")[0].replace(/^\//, "").replace(/\/$/, "");
  return clean;
}

export function getPrefetchTasks(routeKey: string): PrefetchTask[] {
  // Dynamic routes first — the static switch below can't match these.
  // View/edit listing (/{userId}/products/{productId}[/edit]): prefetch the
  // listing itself plus the retail categories its label resolution needs, so
  // the progress bar runs on the PREVIOUS page until the data is in cache
  // and the page lands fully rendered — same behavior as every static route.
  const listingMatch = routeKey.match(/^products\/([^/]+)(\/edit)?$/);
  if (
    listingMatch &&
    listingMatch[1] !== "add" &&
    listingMatch[1] !== "reviews"
  ) {
    const productId = listingMatch[1];
    return [
      {
        queryKey: queryKeys.products.detail(productId),
        queryFn: () => categoriesApi.getProduct(productId),
      },
      {
        queryKey: queryKeys.products.categories,
        queryFn: categoriesApi.getCategories,
      },
    ];
  }

  // One buyer request (/{userId}/buyer-requests/{requestId}): the request
  // plus the wallet, which decides whether the offer form can be sent.
  const requestMatch = routeKey.match(/^buyer-requests\/([^/]+)$/);
  if (requestMatch) {
    const requestId = requestMatch[1];
    return [
      {
        queryKey: queryKeys.vendorBuyerRequests.detail(requestId),
        queryFn: () => fetchVendorBuyerRequest(requestId),
      },
      {
        queryKey: queryKeys.wallet.detail,
        queryFn: walletApi.getWallet,
      },
    ];
  }

  switch (routeKey) {
    case "products": {
      const defaultParams = {
        page: 1,
        limit: 10,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
      };
      return [
        {
          queryKey: queryKeys.products.categories,
          queryFn: categoriesApi.getCategories,
        },
        {
          queryKey: queryKeys.products.list(defaultParams),
          queryFn: () => categoriesApi.getProducts(defaultParams),
        },
      ];
    }
    case "settings":
      return [
        {
          queryKey: queryKeys.settings.profile,
          queryFn: settingsApi.fetchProfile,
        },
      ];
    case "wallet":
      return [
        {
          queryKey: queryKeys.wallet.detail,
          queryFn: walletApi.getWallet,
        },
        {
          queryKey: queryKeys.wallet.stats(),
          queryFn: () => walletApi.getStats(),
        },
      ];
    case "referrals":
      return [
        {
          queryKey: queryKeys.referrals.mine,
          queryFn: fetchMyReferrals,
        },
      ];
    case "buyer-requests":
      return [
        {
          queryKey: queryKeys.vendorBuyerRequests.list,
          queryFn: fetchVendorBuyerRequests,
        },
        {
          queryKey: queryKeys.wallet.detail,
          queryFn: walletApi.getWallet,
        },
      ];
    case "store":
      return [
        {
          queryKey: queryKeys.store.mine,
          queryFn: storeApi.getMyStore,
        },
      ];
    case "orders":
      return [
        {
          queryKey: queryKeys.vendorOrders.list(),
          queryFn: () => vendorOrdersApi.list(),
        },
      ];
    case "notifications":
      return [
        {
          queryKey: ["notifications"],
          queryFn: fetchNotifications,
        },
      ];
    case "hub": {
      const isVendor = Boolean(useUserStore.getState().user);
      const isBuyer = Boolean(useBuyerStore.getState().buyer);
      if (isVendor) {
        return [
          {
            queryKey: queryKeys.hub.home("vendor"),
            queryFn: () => fetchHubHome("vendor"),
          },
        ];
      }
      if (isBuyer) {
        return [
          {
            queryKey: queryKeys.hub.home("buyer"),
            queryFn: () => fetchHubHome("buyer"),
          },
        ];
      }
      return [];
    }
    case "hub/boost":
      return [
        {
          queryKey: queryKeys.hub.context,
          queryFn: fetchHubContext,
        },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
        {
          queryKey: queryKeys.hub.boosts,
          queryFn: fetchHubBoosts,
        },
        {
          queryKey: queryKeys.products.list({ limit: 50 }),
          queryFn: () => categoriesApi.getProducts({ limit: 50 }),
        },
      ];
    case "hub/advert":
      return [
        {
          queryKey: queryKeys.hub.context,
          queryFn: fetchHubContext,
        },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
      ];
    case "hub/analytics":
      return [
        {
          queryKey: queryKeys.hub.analytics,
          queryFn: fetchHubAnalytics,
        },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
      ];
    case "hub/community":
      return [
        {
          queryKey: queryKeys.hub.community,
          queryFn: fetchHubCommunity,
        },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
      ];
    case "hub/vendors":
      return [
        {
          queryKey: queryKeys.hub.vendors,
          queryFn: fetchHubVendors,
        },
      ];
    default:
      return [];
  }
}

export async function runPrefetchTasks(
  queryClient: QueryClient,
  tasks: PrefetchTask[],
  onProgress: (percent: number) => void,
): Promise<void> {
  const total = tasks.length;
  if (total === 0) {
    onProgress(100);
    return;
  }

  let completed = 0;
  const report = () => {
    completed += 1;
    const ratio = completed / total;
    onProgress(8 + Math.round(ratio * 84));
  };

  onProgress(8);

  const results = await Promise.allSettled(
    tasks.map(async ({ queryKey, queryFn, infinite }) => {
      try {
        if (infinite) {
          await queryClient.prefetchInfiniteQuery({
            queryKey,
            queryFn,
            initialPageParam: infinite.initialPageParam,
            getNextPageParam: infinite.getNextPageParam,
          });
        } else {
          await queryClient.prefetchQuery({ queryKey, queryFn });
        }
      } finally {
        report();
      }
    }),
  );

  const failure = results.find((r) => r.status === "rejected") as
    | PromiseRejectedResult
    | undefined;

  onProgress(100);

  if (failure) {
    throw failure.reason;
  }
}

export function getPrefetchFailureMessage(error: unknown): string {
  return getErrorMessage(error, "Failed to load page data");
}

export function normalizeDashboardHref(
  href: string,
  _pathname?: string,
): string {
  return resolveRouteHref(href);
}
export function resolveRouteHref(href: string, _pathname?: string): string {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }
  const clean = href.replace(/^\//, "");
  return `/${clean}`;
}
