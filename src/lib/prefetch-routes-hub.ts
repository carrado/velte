import { categoriesApi } from "@/services/products";
import { queryKeys } from "@/lib/query-keys";
import { isPublicProductSlug } from "@/lib/publicProductSlug";
import {
  fetchHubAdverts,
  fetchHubBoosts,
  fetchHubContext,
  fetchHubHome,
  fetchHubVendors,
} from "@/services/hub";
import { storeApi } from "@/services/store";
import type { PrefetchTask } from "@/lib/prefetch-routes";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

// The /hub tree's prefetch map — same contract as prefetch-routes.ts /
// prefetch-routes-chat.ts: warm the destination's page-blocking queries
// before router.push, so Hub screens land from cache instead of a skeleton.

export function getHubRouteKey(href: string): string {
  const segments = href.split("/").filter(Boolean);
  if (segments[0] !== "hub") return segments.join("/");
  return segments.join("/");
}

export function normalizeHubHref(href: string): string {
  return href;
}

export function getHubPrefetchTasks(routeKey: string): PrefetchTask[] {
  const isVendor = Boolean(useUserStore.getState().user);
  const isBuyer = Boolean(useBuyerStore.getState().buyer);

  // Public product page (`/{slug}`) — opened from Hub listing cards.
  if (!routeKey.includes("/") && isPublicProductSlug(routeKey)) {
    return [
      {
        queryKey: queryKeys.store.productBySlug(routeKey),
        queryFn: () => storeApi.getPublicProductBySlug(routeKey),
      },
    ];
  }

  switch (routeKey) {
    case "hub":
      if (isVendor) {
        return [
          {
            queryKey: queryKeys.hub.home("vendor"),
            queryFn: () => fetchHubHome("vendor"),
          },
          { queryKey: queryKeys.hub.context, queryFn: fetchHubContext },
          { queryKey: queryKeys.hub.adverts, queryFn: fetchHubAdverts },
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

    case "hub/vendors":
      if (!isBuyer && !isVendor) return [];
      return [
        {
          queryKey: queryKeys.hub.vendors,
          queryFn: fetchHubVendors,
        },
      ];

    case "hub/boost":
      if (!isVendor) return [];
      return [
        { queryKey: queryKeys.hub.context, queryFn: fetchHubContext },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
        { queryKey: queryKeys.hub.boosts, queryFn: fetchHubBoosts },
        {
          queryKey: queryKeys.products.list({ limit: 50 }),
          queryFn: () => categoriesApi.getProducts({ limit: 50 }),
        },
      ];

    case "hub/advert":
      if (!isVendor) return [];
      return [
        { queryKey: queryKeys.hub.context, queryFn: fetchHubContext },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
      ];

    default:
      return [];
  }
}
