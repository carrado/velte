export interface WalletAutoRecharge {
  enabled: boolean;
  /** Preferences were saved before a card existed — auto-recharge turns on
   * automatically after the first card top-up. */
  pendingEnable: boolean;
  thresholdKobo: number;
  topupKobo: number;
  hasCardOnFile: boolean;
  last4: string | null;
  cardType: string | null;
}

export interface WalletDva {
  accountNumber: string;
  bankName: string;
  accountName: string;
}

export interface Wallet {
  balanceKobo: number;
  currency: string;
  autoRecharge: WalletAutoRecharge;
  dva: WalletDva | null;
  status: "active" | "suspended";
}

export type WalletTransactionType = "topup" | "debit";

export interface WalletTransactionItem {
  id: string;
  type: WalletTransactionType;
  amountKobo: number;
  balanceAfterKobo: number;
  status: "pending" | "success" | "failed";
  channel: string | null;
  description: string | null;
  createdAt: string;
}

export interface WalletTransactionsResult {
  items: WalletTransactionItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WalletTransactionsParams {
  page?: number;
  limit?: number;
  type?: WalletTransactionType | "all";
  startDate?: string;
  endDate?: string;
}

export interface TopupInitializeResult {
  authorizationUrl: string;
  reference: string;
}

/** First-time auto-recharge setup riding along with a card top-up — persisted
 * by the backend only after the payment succeeds. */
export interface AutoRechargeSetup {
  thresholdKobo: number;
  topupKobo: number;
}

export interface SetFundingMethodPayload {
  enabled?: boolean;
  thresholdKobo?: number;
  topupKobo?: number;
}

export interface WalletMonthlySpendPoint {
  year: number;
  month: number;
  spentKobo: number;
  leads: number;
}

export interface WalletStats {
  totalSpentKobo: number;
  totalLeads: number;
  totalToppedUpKobo: number;
  topupsCount: number;
  monthSpentKobo: number;
  monthLeads: number;
  monthly: WalletMonthlySpendPoint[];
}
