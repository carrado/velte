"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { naira } from "@/lib/plans";
import { getPayLink, initializePay } from "@/services/pay";
import type { PayLinkData } from "@/types/pay";

export default function PayPage() {
  return (
    <Suspense fallback={<CenteredCard>Loading…</CenteredCard>}>
      <PayPageInner />
    </Suspense>
  );
}

function PayPageInner() {
  const params = useParams<{ linkId: string }>();
  const searchParams = useSearchParams();
  const linkId = params.linkId;
  const ref = searchParams.get("ref") ?? undefined;

  const [data, setData] = useState<PayLinkData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [enteredAmount, setEnteredAmount] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPayLink(linkId, ref)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: unknown) => {
        if (active) {
          setLoadError(
            e instanceof Error
              ? e.message
              : "This payment link is unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [linkId, ref]);

  const alreadyPaid = data?.order?.paid === true;

  // The amount to charge: fixed (from order/link) or entered by the payer.
  const chargeAmount = data?.amountFixed
    ? data.amount
    : enteredAmount
      ? Number(enteredAmount)
      : null;

  const handlePay = async () => {
    if (!data || paying || alreadyPaid) return;

    if (!data.amountFixed && (!chargeAmount || chargeAmount <= 0)) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setPaying(true);
    try {
      const { authorization_url } = await initializePay(linkId, {
        ref,
        email: email.trim() || undefined,
        amount: data.amountFixed ? undefined : Number(enteredAmount),
      });
      // Full-page redirect to Paystack — more reliable than a popup for the
      // mobile shoppers who arrive here from a WhatsApp link. Paystack returns
      // to /payment/callback after payment.
      window.location.href = authorization_url;
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Could not start payment. Try again.",
      );
      setPaying(false);
    }
  };

  if (loading) {
    return <CenteredCard>Loading payment details…</CenteredCard>;
  }

  if (loadError || !data) {
    return (
      <CenteredCard>
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <h1 className="text-lg font-semibold text-gray-900">
            Payment unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {loadError || "This payment link is no longer active."}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Please contact the store for a new link.
          </p>
        </div>
      </CenteredCard>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6 sm:p-8">
        {/* Payee */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Pay to
          </p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">
            {data.accountName}
          </h1>
          {data.description ? (
            <p className="mt-1 text-sm text-gray-500">{data.description}</p>
          ) : null}
        </div>

        {/* Order summary */}
        {data.order ? (
          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
            {data.order.customerName ? (
              <p className="text-gray-500">
                Hi {data.order.customerName}, here&apos;s your order:
              </p>
            ) : null}
            <div className="mt-1 flex items-center justify-between">
              <span className="font-medium text-gray-900">
                {data.order.product || "Your order"}
              </span>
            </div>
          </div>
        ) : null}

        {/* Amount */}
        <div className="mt-6 text-center">
          {data.amountFixed ? (
            <>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Amount
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {data.amount != null ? naira(data.amount) : "—"}
              </p>
            </>
          ) : (
            <label className="block text-left">
              <span className="text-sm font-medium text-gray-700">
                Enter amount (₦)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={enteredAmount}
                onChange={(e) => setEnteredAmount(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-lg focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
          )}
        </div>

        {/* Optional email for receipt */}
        {!alreadyPaid ? (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-gray-700">
              Email{" "}
              <span className="font-normal text-gray-400">
                (optional, for your receipt)
              </span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </label>
        ) : null}

        {/* Action */}
        {alreadyPaid ? (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
            ✅ This order has already been paid. Thank you!
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={paying}
            className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-3 text-center font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying
              ? "Redirecting to payment…"
              : chargeAmount != null && chargeAmount > 0
                ? `Pay ${naira(chargeAmount)}`
                : "Pay"}
          </button>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          Secured by Paystack · Powered by Velte
        </p>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-8 text-sm text-gray-500">
        {children}
      </div>
    </div>
  );
}
