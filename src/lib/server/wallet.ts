import { backendData } from "./backend";
import type {
  Wallet,
  WalletTransactionsResult,
  TopupInitializeResult,
  SetFundingMethodPayload,
  AutoRechargeSetup,
  WalletStats,
} from "@/types/wallet";

export async function getWallet(cookie: string): Promise<Wallet> {
  return backendData<Wallet>("/wallet", { cookie });
}

export async function getWalletStats(
  cookie: string,
  months?: number,
): Promise<WalletStats> {
  return backendData<WalletStats>(
    `/wallet/stats${months ? `?months=${months}` : ""}`,
    { cookie },
  );
}

export async function initializeTopup(
  amountNaira: number,
  cookie: string,
  autoRecharge?: AutoRechargeSetup,
): Promise<TopupInitializeResult> {
  return backendData<TopupInitializeResult>("/wallet/topup/initialize", {
    method: "POST",
    body: { amountNaira, ...(autoRecharge ? { autoRecharge } : {}) },
    cookie,
  });
}

export async function verifyTopup(
  reference: string,
  cookie: string,
): Promise<Wallet> {
  return backendData<Wallet>("/wallet/topup/verify", {
    method: "POST",
    body: { reference },
    cookie,
  });
}

export async function setFundingMethod(
  payload: SetFundingMethodPayload,
  cookie: string,
): Promise<Wallet> {
  return backendData<Wallet>("/wallet/funding-method", {
    method: "PUT",
    body: payload,
    cookie,
  });
}

export async function requestDva(cookie: string): Promise<Wallet> {
  return backendData<Wallet>("/wallet/dva", { method: "POST", cookie });
}

export async function listWalletTransactions(
  searchParams: URLSearchParams,
  cookie: string,
): Promise<WalletTransactionsResult> {
  const qs = searchParams.toString();
  return backendData<WalletTransactionsResult>(
    `/wallet/transactions${qs ? `?${qs}` : ""}`,
    { cookie },
  );
}
