import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchOrders } from "@/services/orders";
import { queryKeys } from "@/lib/query-keys";
import type { OrderListParams } from "@/types/order";

/**
 * Page-paged orders for a Load-more / infinite-scroll UI. Filters/sort live in
 * `params`; the page number is driven internally from each page's `pageInfo`.
 * Changing `params` starts a fresh list.
 */
export function useOrdersConnection(params: Omit<OrderListParams, "page">) {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: ({ pageParam }) => fetchOrders({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.page < lastPage.pageInfo.totalPages
        ? lastPage.pageInfo.page + 1
        : undefined,
    placeholderData: keepPreviousData,
  });
}
