import { api } from "@/lib/api-client";
import type {
  Wallet,
  WalletTransactionsResult,
  WalletTransactionsParams,
  TopupInitializeResult,
  SetFundingMethodPayload,
  AutoRechargeSetup,
  WalletStats,
} from "@/types/wallet";

export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const { wallet } = await api.get<{ wallet: Wallet }>("/api/wallet");
    return wallet;
  },

  getStats: async (months?: number): Promise<WalletStats> => {
    const { stats } = await api.get<{ stats: WalletStats }>(
      `/api/wallet/stats${months ? `?months=${months}` : ""}`,
    );
    return stats;
  },

  initializeTopup: async (
    amountNaira: number,
    autoRecharge?: AutoRechargeSetup,
  ): Promise<TopupInitializeResult> => {
    return api.post<TopupInitializeResult>("/api/wallet/topup/initialize", {
      amountNaira,
      ...(autoRecharge ? { autoRecharge } : {}),
    });
  },

  verifyTopup: async (reference: string): Promise<Wallet> => {
    const { wallet } = await api.post<{ wallet: Wallet }>(
      "/api/wallet/topup/verify",
      { reference },
    );
    return wallet;
  },

  setFundingMethod: async (
    payload: SetFundingMethodPayload,
  ): Promise<Wallet> => {
    const { wallet } = await api.put<{ wallet: Wallet }>(
      "/api/wallet/funding-method",
      payload,
    );
    return wallet;
  },

  requestDva: async (): Promise<Wallet> => {
    const { wallet } = await api.post<{ wallet: Wallet }>("/api/wallet/dva");
    return wallet;
  },

  getTransactions: async (
    params: WalletTransactionsParams,
  ): Promise<WalletTransactionsResult> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.type && params.type !== "all") qs.set("type", params.type);
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);

    return api.get<WalletTransactionsResult>(
      `/api/wallet/transactions?${qs.toString()}`,
    );
  },
};
