import { backendData } from "./backend";
import type {
  PayoutAccount,
  PayoutBank,
  ResolvedAccount,
  SavePayoutAccountPayload,
} from "@/types/payout";

export async function getPayoutBanks(cookie: string): Promise<PayoutBank[]> {
  const { banks } = await backendData<{ banks: PayoutBank[] }>(
    "/payouts/banks",
    { cookie },
  );
  return banks;
}

export async function getPayoutAccount(
  cookie: string,
): Promise<PayoutAccount | null> {
  const { payout } = await backendData<{ payout: PayoutAccount | null }>(
    "/payouts",
    { cookie },
  );
  return payout;
}

export async function resolvePayoutAccount(
  payload: SavePayoutAccountPayload,
  cookie: string,
): Promise<ResolvedAccount> {
  return backendData<ResolvedAccount>("/payouts/resolve", {
    method: "POST",
    body: payload,
    cookie,
  });
}

export async function savePayoutAccount(
  payload: SavePayoutAccountPayload,
  cookie: string,
): Promise<PayoutAccount> {
  const { payout } = await backendData<{ payout: PayoutAccount }>("/payouts", {
    method: "POST",
    body: payload,
    cookie,
  });
  return payout;
}

export async function removePayoutAccount(cookie: string): Promise<void> {
  await backendData("/payouts", { method: "DELETE", cookie });
}
