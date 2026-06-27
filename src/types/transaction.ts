export type TransactionStatus = "Complete" | "Pending" | "Canceled";
export type TransactionMethod = "CC" | "PayPal" | "Bank";
export type TransactionTabFilter = "all" | "completed" | "pending" | "canceled";

export interface Transaction {
  id: string;
  /** Display code (CUST-XXXXXX), derived server-side to match the customers table. */
  customerId: string;
  name: string;
  date: string;
  /** Total, pre-formatted in Naira (e.g. "₦12,500"). */
  total: string;
  method: TransactionMethod;
  status: TransactionStatus;
  /** Originating order's DB id — links "View details" to the order. Null if unknown. */
  orderId?: string | null;
}

export interface TransactionStats {
  totalRevenue: string;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  revenueChange: string;
  completedChange: string;
  pendingChange: string;
  failedChange: string;
}

export interface PaymentLink {
  id: string;
  url: string;
  amount?: number;
  description?: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
  expiresAt?: string;
}

export interface BankOption {
  code: string;
  name: string;
}

export interface ResolvedAccount {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface GeneratePaymentLinkPayload {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount?: number;
  description?: string;
}

export interface FetchTransactionsParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  paymentMethod?: TransactionMethod;
  startDate?: string;
  endDate?: string;
}

/** Unwrapped payload of `GET /transactions` (envelope `data`). */
export interface TransactionsListResult {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: TransactionStats;
  paymentLink: PaymentLinkData | null;
}

export interface PaymentLinkData {
  id: string;
  url: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number | null;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface InitiateOrderRefundPayload {
  /** Internal order ID (not the display orderId like "#ORD0001") */
  orderId: string;
  /** Refund amount in NGN (naira, not kobo — backend converts) */
  amount: number;
  reason: string;
  /**
   * The customer's bank account the vendor refunded to. Required under the
   * manual-transfer model: funds went directly to the vendor's bank, so the
   * vendor sends the money back and we record where it went.
   */
  customerAccountNumber: string;
  customerBankCode: string;
  customerBankName: string;
  customerAccountName: string;
}

/** Unwrapped payload of `POST /transactions/order-refund` (envelope `data`). */
export interface OrderRefundResult {
  /** Server-side record id for the refund (not a Paystack reference). */
  refundReference: string;
  amount: number; // Amount in NGN (as sent)
  status: "pending" | "processed" | "failed";
}
