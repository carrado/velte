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

/** Tiered per-lead pricing (per explicit request) — the LOWER a vendor's
 * wallet balance, the MORE each lead costs, incentivizing bigger top-ups
 * instead of small, frequent ones. Mirrors `LEAD_TIERS` in velte-backend's
 * utils/leadPricing.js — keep these in sync until the price is served from
 * the wallet/stats response instead. Ordered highest-balance-first so
 * `leadCostForBalance`'s own linear scan returns on the first tier the
 * balance actually clears. */
export const LEAD_TIERS = [
  { minBalanceKobo: 1_000_000, costKobo: 50_000 }, // ≥ ₦10,000 → ₦500/lead
  { minBalanceKobo: 500_000, costKobo: 70_000 }, // ₦5,000–₦9,999 → ₦700/lead
  { minBalanceKobo: 0, costKobo: 100_000 }, // < ₦5,000 → ₦1,000/lead
];

/** The per-lead rate that applies to a given wallet balance right now. */
export function leadCostForBalance(balanceKobo: number): number {
  for (const tier of LEAD_TIERS) {
    if (balanceKobo >= tier.minBalanceKobo) return tier.costKobo;
  }
  return LEAD_TIERS[LEAD_TIERS.length - 1].costKobo;
}

/** The most expensive tier's own rate — the minimum balance needed to
 * afford at least one more lead, whatever tier that lead ends up costing
 * (every OTHER tier's own minBalanceKobo comfortably covers its own,
 * cheaper costKobo, so this one flat floor is all "can they afford a
 * lead at all" needs — see velte-backend's own MIN_LEAD_COST_KOBO). */
export const MIN_LEAD_COST_KOBO = LEAD_TIERS[LEAD_TIERS.length - 1].costKobo;

/** How many more leads a balance can still cover, capped at `cap` — callers
 * only ever need to distinguish a few buckets ("0", "1", "2+"), never an
 * exact count for a large balance, so this stops simulating once it hits
 * the cap rather than walking the whole balance down to zero. */
export function leadsRemaining(balanceKobo: number, cap = 2): number {
  let remaining = balanceKobo;
  let count = 0;
  while (count < cap) {
    const cost = leadCostForBalance(remaining);
    if (remaining < cost) break;
    remaining -= cost;
    count += 1;
  }
  return count;
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
