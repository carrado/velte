import { apiClient } from "@/lib/api";
import type {
  FetchTransactionsParams,
  FetchTransactionsResponse,
  GeneratePaymentLinkPayload,
  GeneratePaymentLinkResponse,
  ResolveAccountResponse,
  BankOption,
} from "@/types/transaction";

export const transactionService = {
  /**
   * Fetch paginated transactions with optional filters
   */
  async getTransactions(
    params: FetchTransactionsParams = {},
  ): Promise<FetchTransactionsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.paymentMethod) query.set("paymentMethod", params.paymentMethod);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);

    const qs = query.toString();
    return apiClient<FetchTransactionsResponse>(
      `/transactions${qs ? `?${qs}` : ""}`,
    );
  },

  /**
   * Resolve a bank account — called when user finishes typing 10-digit number
   */
  async resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolveAccountResponse> {
    return apiClient<ResolveAccountResponse>(
      `/transactions/resolve-account?accountNumber=${accountNumber}&bankCode=${bankCode}`,
    );
  },

  /**
   * Generate a payment link
   */
  async generatePaymentLink(
    payload: GeneratePaymentLinkPayload,
  ): Promise<GeneratePaymentLinkResponse> {
    return apiClient<GeneratePaymentLinkResponse>(
      "/transactions/payment-link",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Fetch list of supported banks
   */
  async getBanks(): Promise<{ success: boolean; data: BankOption[] }> {
    return apiClient<{ success: boolean; data: BankOption[] }>(
      "/transactions/banks",
    );
  },
};
