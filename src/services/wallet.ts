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

/** ONE PRICE, FOR EVERYBODY: ₦1,000 per lead (2026-09-03).
 *
 *  Replaced three balance-tiers (₦500 / ₦700 / ₦1,000, cheaper the more you
 *  held) and the trap they created: a vendor on ₦10,500 who spent ₦600
 *  dropped a tier and paid ₦200 more on EVERY lead afterwards — ₦4,000 over
 *  twenty leads, to save ₦600. Invisible, and it punished using the product.
 *  Every piece of machinery built to contain that (the 30-day spend lookback,
 *  the last-purchase short-circuit in velte-backend’s wallet controller)
 *  existed only because the price moved with the balance. A flat price
 *  deletes the problem rather than managing it.
 *
 *  It reads as a rise — everyone now pays what only the lowest-balance
 *  vendors used to. It is not one in practice, because it shipped alongside
 *  charge-on-CONTACT: a vendor is no longer billed for accepting a request
 *  that goes nowhere, only for a buyer who actually reached them. Higher per
 *  lead, far fewer leads charged.
 *
 *  Mirrors velte-backend’s utils/leadPricing.js — keep these in sync until
 *  the price is served from the wallet/stats response instead. */
export const LEAD_COST_KOBO = 100_000; // ₦1,000

/** The per-lead rate. Takes no balance any more and returns a constant, but
 *  stays a function so call sites read the same and there is one obvious
 *  place to put variable pricing back if it ever returns. */
export function leadCost(): number {
  return LEAD_COST_KOBO;
}

/** The balance needed to afford one more lead. The same number as the rate
 *  now that there is only one rate — kept separate because “what does it
 *  cost” and “can they afford it” are different questions, and only the
 *  first is a price. */
export const MIN_LEAD_COST_KOBO = LEAD_COST_KOBO;

/** How many more leads a balance can still cover, capped at `cap` — callers
 *  only ever need to distinguish a few buckets ("0", "1", "2+"), never an
 *  exact count for a large balance. A plain divide now that the price is
 *  flat; it used to simulate the drain tier by tier. Clamped at 0 so a
 *  negative balance (possible under charge-on-contact, which lets a
 *  connection through even if the wallet moved after the accept) reports
 *  none rather than a negative count. */
export function leadsRemaining(balanceKobo: number, cap = 2): number {
  return Math.max(0, Math.min(Math.floor(balanceKobo / LEAD_COST_KOBO), cap));
}

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
