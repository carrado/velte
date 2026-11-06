"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cartApi } from "@/services/cart";
import { useCartStore } from "@/store/cartStore";
import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "@/components/icons";

function CartCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clear = useCartStore((s) => s.clear);
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
        await cartApi.verify(reference);
        clear();
        setState("success");
        setTimeout(() => router.replace("/chat/orders"), 1400);
      } catch (err) {
        setState("failed");
        setMessage(
          err instanceof Error ? err.message : "Couldn't confirm that payment.",
        );
      }
    })();
  }, [clear, router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-sm ring-1 ring-gray-100 p-8 text-center">
        {state === "verifying" && (
          <>
            <LoaderIcon
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
            <CheckCircleIcon size={32} className="mx-auto text-green-500" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">
              Order placed
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              We&apos;re holding the payment until the vendor confirms.
            </p>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircleIcon size={32} className="mx-auto text-red-500" />
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

export default function CartCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoaderIcon size={32} className="animate-spin text-orange-500" />
        </div>
      }
    >
      <CartCallbackContent />
    </Suspense>
  );
}
