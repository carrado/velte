"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { walletApi } from "@/services/wallet";
import { usersApi } from "@/services/users";

// Paystack redirects here after hosted checkout for wallet top-ups (see
// initializeTopup's callback_url). Verifies the reference, then bounces the
// vendor back into their wallet page with a status flag.
function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"verifying" | "success" | "failed">(
    "verifying",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const reference =
      searchParams.get("reference") ?? searchParams.get("trxref");
    if (!reference) {
      setState("failed");
      setMessage("No payment reference found.");
      return;
    }

    (async () => {
      try {
        await walletApi.verifyTopup(reference);
      } catch (err) {
        setState("failed");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
        return;
      }

      // Payment is confirmed at this point — show success regardless of
      // what happens below. getMe() only resolves WHERE to send the vendor
      // next; if it 401s (a session hiccup returning from Paystack's
      // cross-origin redirect can momentarily look like this), that must
      // never overwrite the success state already shown with a misleading
      // "Payment not confirmed" — the top-up went through either way.
      // api-client's own 401 handler already takes care of sending them to
      // log back in when that happens, so there's nothing more to do here.
      setState("success");
      try {
        const user = await usersApi.getMe();
        setTimeout(() => {
          router.replace(`/${user.id}/wallet?topup=success`);
        }, 1200);
      } catch {
        /* handled globally by api-client's 401 handler */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-8 text-center">
        {state === "verifying" && (
          <>
            <Loader2
              size={32}
              className="mx-auto animate-spin text-orange-500"
            />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">
              Confirming your payment…
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Please don&apos;t close this page.
            </p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 size={32} className="mx-auto text-green-500" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">
              Wallet topped up
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Taking you back to your wallet…
            </p>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle size={32} className="mx-auto text-red-500" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">
              Payment not confirmed
            </h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-orange-500" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
