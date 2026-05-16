export type TransactionStatus = "Complete" | "Pending" | "Canceled";
export type TransactionMethod = "CC" | "PayPal" | "Bank";
export type TransactionTabFilter = "all" | "completed" | "pending" | "canceled";

export interface Transaction {
  id: string;
  customerId: string;
  name: string;
  date: string;
  total: string;
  method: TransactionMethod;
  status: TransactionStatus;
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

export interface GeneratePaymentLinkResponse {
  success: boolean;
  data: PaymentLink;
  message?: string;
}

export interface ResolveAccountResponse {
  success: boolean;
  data: ResolvedAccount;
  message?: string;
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

export interface FetchTransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    stats: TransactionStats;
    paymentLink: PaymentLinkData | null;
  };
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

export type PaymentLinkWarningVariant = "deactivate" | "delete";

export interface PaymentLinkWarningModalProps {
  open: boolean;
  variant: PaymentLinkWarningVariant;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export interface PaymentLinkActionResponse {
  success: boolean;
  data?: PaymentLinkData;
  message?: string;
}
