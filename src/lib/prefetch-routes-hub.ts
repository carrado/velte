import { categoriesApi } from "@/services/products";
import { queryKeys } from "@/lib/query-keys";
import { isPublicProductSlug } from "@/lib/publicProductSlug";
import {
  fetchHubAdverts,
  fetchHubAnalytics,
  fetchHubBoosts,
  fetchHubCommunity,
  fetchHubContext,
  fetchHubHome,
  fetchHubVendors,
} from "@/services/hub";
import { storeApi } from "@/services/store";
import { getPrefetchTasks, type PrefetchTask } from "@/lib/prefetch-routes";
import { fetchNotifications } from "@/services/notifications";
import { fetchMyRequests } from "@/services/buyerRequests";
import { cartApi } from "@/services/cart";
import { useBuyerStore } from "@/store/buyerStore";
import { useUserStore } from "@/store/userStore";

// The /hub tree's prefetch map — same contract as prefetch-routes.ts /
// prefetch-routes-chat.ts: warm the destination's page-blocking queries
// before router.push, so Hub screens land from cache instead of a skeleton.

export function getHubRouteKey(href: string): string {
  const clean = href.split("?")[0].replace(/^\//, "").replace(/\/$/, "");
  return clean;
}

export function normalizeHubHref(href: string): string {
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

    case "hub/analytics":
      if (!isVendor) return [];
      return [
        { queryKey: queryKeys.hub.analytics, queryFn: fetchHubAnalytics },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
      ];

    case "hub/community":
      if (!isVendor) return [];
      return [
        { queryKey: queryKeys.hub.community, queryFn: fetchHubCommunity },
        {
          queryKey: queryKeys.hub.home("vendor"),
          queryFn: () => fetchHubHome("vendor"),
        },
      ];

    case "chat/requests":
    case "requests":
      if (!isBuyer) return [];
      return [
        {
          queryKey: ["buyer", "requests"],
          queryFn: fetchMyRequests,
        },
      ];

    case "chat/notifications":
      return [
        {
          queryKey: ["notifications"],
          queryFn: fetchNotifications,
        },
      ];

    case "chat/orders":
      if (!isBuyer) return [];
      return [
        {
          queryKey: queryKeys.cart.buyerOrders,
          queryFn: cartApi.listOrders,
        },
      ];

    default:
      return getPrefetchTasks(routeKey);
  }
}
