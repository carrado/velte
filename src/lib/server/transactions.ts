import { backendFetch } from "./backend";
import { customerCode } from "./customers";
import type {
  TransactionsListResult,
  GeneratePaymentLinkPayload,
  PaymentLink,
  PaymentLinkData,
  ResolvedAccount,
  BankOption,
  InitiateOrderRefundPayload,
  OrderRefundResult,
} from "@/types/transaction";

/* Server data module for transactions. The backend returns UI-shaped payloads;
   here we map each transaction's raw customer id to the same CUST-XXXXXX display
   code the customers table uses, so the same customer reads consistently. */

interface Wrapped<T> {
  data: T;
}

export async function listTransactions(
  search: URLSearchParams,
  cookie: string,
): Promise<TransactionsListResult> {
  const qs = search.toString();
  const { data } = await backendFetch<Wrapped<TransactionsListResult>>(
    `/transactions${qs ? `?${qs}` : ""}`,
    { cookie },
  );
  return {
    ...data,
    transactions: data.transactions.map((t) => ({
      ...t,
      customerId: customerCode(t.customerId),
    })),
  };
}

export async function resolveAccount(
  accountNumber: string,
  bankCode: string,
  cookie: string,
): Promise<ResolvedAccount> {
  const { data } = await backendFetch<Wrapped<ResolvedAccount>>(
    `/transactions/resolve-account?accountNumber=${encodeURIComponent(
      accountNumber,
    )}&bankCode=${encodeURIComponent(bankCode)}`,
    { cookie },
  );
  return data;
}

export async function generatePaymentLink(
  payload: GeneratePaymentLinkPayload,
  cookie: string,
): Promise<PaymentLink> {
  const { data } = await backendFetch<Wrapped<PaymentLink>>(
    "/transactions/payment-link",
    { method: "POST", body: payload, cookie },
  );
  return data;
}

export async function listBanks(cookie: string): Promise<BankOption[]> {
  const { data } = await backendFetch<Wrapped<BankOption[]>>(
    "/transactions/banks",
    { cookie },
  );
  return data;
}

export async function deactivatePaymentLink(
  id: string,
  cookie: string,
): Promise<PaymentLinkData | null> {
  const { data } = await backendFetch<Wrapped<PaymentLinkData | null>>(
    `/transactions/payment-link/${id}/deactivate`,
    { method: "PATCH", cookie },
  );
  return data ?? null;
}

export async function reactivatePaymentLink(
  id: string,
  cookie: string,
): Promise<PaymentLinkData | null> {
  const { data } = await backendFetch<Wrapped<PaymentLinkData | null>>(
    `/transactions/payment-link/${id}/reactivate`,
    { method: "PATCH", cookie },
  );
  return data ?? null;
}

export async function deletePaymentLink(
  id: string,
  cookie: string,
): Promise<void> {
  await backendFetch(`/transactions/payment-link/${id}`, {
    method: "DELETE",
    cookie,
  });
}

export async function initiateOrderRefund(
  payload: InitiateOrderRefundPayload,
  cookie: string,
): Promise<OrderRefundResult> {
  const { data } = await backendFetch<Wrapped<OrderRefundResult>>(
    "/transactions/order-refund",
    { method: "POST", body: payload, cookie },
  );
  return data;
}
