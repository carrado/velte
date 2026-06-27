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

  /**
   * Save the vendor's bank account (account name/number/bank). Customers pay by
   * direct transfer to this account; staffly shares it on WhatsApp at checkout.
   * No Paystack subaccount or hosted payment link is created.
   */
  async saveBankAccount(
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

  /**
   * Whether the vendor has saved a bank account (returned with the transactions
   * list). Used by the dashboard onboarding gate. (Stored in the `paymentLink`
   * field for back-compat — it now holds bank-account details, not a link.)
   */
  async getPaymentLink(): Promise<PaymentLinkData | null> {
    try {
      const res = await this.getTransactions({ limit: 1, page: 1 });
      return res.paymentLink ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Record a refund for a cancelled order. Under the manual-transfer model the
   * customer paid the vendor's bank directly, so there is no platform charge to
   * reverse — the vendor sends the money back themselves and we record the
   * destination account here. Idempotent server-side.
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
