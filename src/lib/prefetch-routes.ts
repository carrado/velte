import type { QueryClient } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  fetchWeeklyReport,
  fetchUsersActivity,
  fetchSalesByMonths,
  fetchTransactions,
  fetchTopProducts,
  fetchBestSelling,
  fetchAddableProducts,
} from "@/services/dashboard";
import { fetchOrders, fetchOrderStats } from "@/services/orders";
import { categoriesApi } from "@/services/products";
import { fetchCustomers } from "@/services/customers";
import { transactionService } from "@/services/transactions";
import { getAISetupStatus } from "@/services/aiSetup";
import { getSubscriptionStatus } from "@/services/subscription";
import { settingsApi } from "@/services/settings";
import { fetchWhatsAppProfile } from "@/services/whatsappProfile";
import {
  DEFAULT_ORDERS_LIST_PARAMS,
  DEFAULT_TRANSACTIONS_LIST_PARAMS,
  queryKeys,
} from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/error-message";

export type PrefetchTask = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
};

export function getRouteKey(href: string): string {
  const segments = href.split("/").filter(Boolean);
  return segments.slice(1).join("/");
}

export function getPrefetchTasks(routeKey: string): PrefetchTask[] {
  switch (routeKey) {
    case "dashboard":
      return [
        {
          queryKey: queryKeys.dashboard.stats,
          queryFn: fetchDashboardStats,
        },
        {
          queryKey: queryKeys.dashboard.bestSelling,
          queryFn: fetchBestSelling,
        },
        {
          queryKey: queryKeys.dashboard.monthlySales,
          queryFn: fetchSalesByMonths,
        },
        {
          queryKey: queryKeys.dashboard.topProducts,
          queryFn: fetchTopProducts,
        },
        {
          queryKey: queryKeys.dashboard.transactions,
          queryFn: fetchTransactions,
        },
        {
          queryKey: queryKeys.dashboard.usersActivity,
          queryFn: fetchUsersActivity,
        },
        {
          queryKey: queryKeys.dashboard.weeklyReport("this_week"),
          queryFn: () => fetchWeeklyReport("this_week"),
        },
        {
          queryKey: queryKeys.dashboard.addableProducts,
          queryFn: fetchAddableProducts,
        },
      ];
    case "orders":
      return [
        {
          queryKey: queryKeys.orders.list(DEFAULT_ORDERS_LIST_PARAMS),
          queryFn: () => fetchOrders(DEFAULT_ORDERS_LIST_PARAMS),
        },
        {
          queryKey: queryKeys.orders.stats,
          queryFn: fetchOrderStats,
        },
      ];
    case "customers":
      return [
        {
          queryKey: queryKeys.customers.list,
          queryFn: fetchCustomers,
        },
      ];
    case "transactions":
      return [
        {
          queryKey: queryKeys.transactions.list(
            DEFAULT_TRANSACTIONS_LIST_PARAMS,
          ),
          queryFn: () =>
            transactionService.getTransactions(
              DEFAULT_TRANSACTIONS_LIST_PARAMS,
            ),
        },
      ];
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
    case "ai-setup":
      return [
        {
          queryKey: queryKeys.aiSetup.status,
          queryFn: getAISetupStatus,
        },
      ];
    case "billing":
      return [
        {
          queryKey: queryKeys.subscription.status,
          queryFn: getSubscriptionStatus,
        },
      ];
    case "settings":
      return [
        {
          queryKey: queryKeys.settings.profile,
          queryFn: settingsApi.fetchProfile,
        },
        {
          queryKey: queryKeys.settings.notifications,
          queryFn: settingsApi.getNotificationSettings,
        },
        {
          queryKey: queryKeys.settings.whatsappProfile,
          queryFn: fetchWhatsAppProfile,
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
    tasks.map(async ({ queryKey, queryFn }) => {
      try {
        await queryClient.prefetchQuery({ queryKey, queryFn });
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
