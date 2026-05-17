import type { FetchTransactionsParams, Transaction } from "@/types/transaction";

export function buildTransactionsListParams(
  input: Partial<FetchTransactionsParams> = {},
): FetchTransactionsParams {
  const params: FetchTransactionsParams = {
    page: input.page ?? 1,
    limit: input.limit ?? 10,
    sortBy: input.sortBy ?? "date",
    sortOrder: input.sortOrder ?? "desc",
  };

  if (input.status) params.status = input.status;
  if (input.search) params.search = input.search;
  if (input.paymentMethod) params.paymentMethod = input.paymentMethod;
  if (input.startDate) params.startDate = input.startDate;
  if (input.endDate) params.endDate = input.endDate;

  return params;
}

export const DEFAULT_TRANSACTIONS_LIST_PARAMS = buildTransactionsListParams();

export function transactionsListParamsFromUi(state: {
  page: number;
  limit: number;
  activeTab: "all" | "completed" | "pending" | "canceled";
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  paymentMethod?: Transaction["method"];
  startDate?: string;
  endDate?: string;
}): FetchTransactionsParams {
  const tabToStatus: Record<
    typeof state.activeTab,
    FetchTransactionsParams["status"] | undefined
  > = {
    all: undefined,
    completed: "Complete",
    pending: "Pending",
    canceled: "Canceled",
  };

  return buildTransactionsListParams({
    page: state.page,
    limit: state.limit,
    status: tabToStatus[state.activeTab],
    search: state.search || undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    paymentMethod: state.paymentMethod,
    startDate: state.startDate,
    endDate: state.endDate,
  });
}
