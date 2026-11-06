import { api } from "@/lib/api-client";
import type {
  PayoutAccount,
  PayoutBank,
  ResolvedAccount,
  SavePayoutAccountPayload,
} from "@/types/payout";

export const payoutsApi = {
  async getBanks(): Promise<PayoutBank[]> {
    const { banks } = await api.get<{ banks: PayoutBank[] }>(
      "/api/payouts/banks",
    );
    return banks;
  },

  async get(): Promise<PayoutAccount | null> {
    const { payout } = await api.get<{ payout: PayoutAccount | null }>(
      "/api/payouts",
    );
    return payout;
  },

  async resolve(payload: SavePayoutAccountPayload): Promise<ResolvedAccount> {
    return api.post<ResolvedAccount>("/api/payouts/resolve", payload);
  },

  async save(payload: SavePayoutAccountPayload): Promise<PayoutAccount> {
    const { payout } = await api.post<{ payout: PayoutAccount }>(
      "/api/payouts",
      payload,
    );
    return payout;
  },

  async remove(): Promise<void> {
    await api.del("/api/payouts");
  },
};
