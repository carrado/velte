import { api } from "@/lib/api-client";
import type {
  FetchTransactionsParams,
  TransactionsListResult,
  GeneratePaymentLinkPayload,
  PaymentLink,
  PaymentLinkData,
  ResolvedAccount,
  BankOption,
  InitiateOrderRefundPayload,
  OrderRefundResult,
} from "@/types/transaction";

export const transactionService = {
  /** Fetch paginated transactions with optional filters */
  async getTransactions(
    params: FetchTransactionsParams = {},
  ): Promise<TransactionsListResult> {
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
    return api.get<TransactionsListResult>(
      `/api/transactions${qs ? `?${qs}` : ""}`,
    );
  },

  /** Resolve a bank account — called when the user finishes typing the number */
  async resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolvedAccount> {
    const { account } = await api.get<{ account: ResolvedAccount }>(
      `/api/transactions/resolve-account?accountNumber=${encodeURIComponent(
        accountNumber,
      )}&bankCode=${encodeURIComponent(bankCode)}`,
    );
    return account;
  },

  /** Generate a payment link */
  async generatePaymentLink(
    payload: GeneratePaymentLinkPayload,
  ): Promise<PaymentLink> {
    const { paymentLink } = await api.post<{ paymentLink: PaymentLink }>(
      "/api/transactions/payment-link",
      payload,
    );
    return paymentLink;
  },

  /** Fetch list of supported banks */
  async getBanks(): Promise<BankOption[]> {
    const { banks } = await api.get<{ banks: BankOption[] }>(
      "/api/transactions/banks",
    );
    return banks;
  },

  async deactivatePaymentLink(id: string): Promise<PaymentLinkData | null> {
    const { paymentLink } = await api.patch<{
      paymentLink: PaymentLinkData | null;
    }>(`/api/transactions/payment-link/${id}/deactivate`);
    return paymentLink;
  },

  async reactivatePaymentLink(id: string): Promise<PaymentLinkData | null> {
    const { paymentLink } = await api.patch<{
      paymentLink: PaymentLinkData | null;
    }>(`/api/transactions/payment-link/${id}/reactivate`);
    return paymentLink;
  },

  async deletePaymentLink(id: string): Promise<void> {
    await api.del(`/api/transactions/payment-link/${id}`);
  },

  async getPaymentLink(): Promise<PaymentLinkData | null> {
    try {
      // Payment link is returned as part of the transactions list response
      const res = await this.getTransactions({ limit: 1, page: 1 });
      return res.paymentLink ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Initiate a refund for a cancelled order. The backend reverses the original
   * Paystack charge back to the customer's payment source (card/bank) — no
   * customer bank details are collected. Idempotent server-side.
   */
  async initiateOrderRefund(
    payload: InitiateOrderRefundPayload,
  ): Promise<OrderRefundResult> {
    const { refund } = await api.post<{ refund: OrderRefundResult }>(
      "/api/transactions/order-refund",
      payload,
    );
    return refund;
  },
};
