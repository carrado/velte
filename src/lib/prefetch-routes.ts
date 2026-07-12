import type { QueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/services/products";
import { settingsApi } from "@/services/settings";
import { walletApi } from "@/services/wallet";
import { fetchMyReferrals } from "@/services/referrals";
import { storeApi } from "@/services/store";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/error-message";

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
  const segments = href.split("/").filter(Boolean);
  return segments.slice(1).join("/");
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
    case "store":
      return [
        {
          queryKey: queryKeys.store.mine,
          queryFn: storeApi.getMyStore,
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

export function normalizeDashboardHref(href: string, pathname: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  if (href.startsWith("/")) {
    const segments = href.split("/").filter(Boolean);
    const userId = pathname.split("/").filter(Boolean)[0];
    if (userId && segments.length === 1) {
      return `/${userId}/${segments[0]}`;
    }
    return href;
  }

  const userId = pathname.split("/").filter(Boolean)[0];
  const clean = href.replace(/^\//, "").replace(/\/$/, "");
  return userId ? `/${userId}/${clean}` : `/${clean}`;
}
