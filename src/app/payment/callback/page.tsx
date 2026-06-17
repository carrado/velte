// app/payment/callback/page.tsx

"use client";

import { useEffect, useState } from "react";

export default function PaymentCallbackPage() {
  // Popup flow (subscription/billing) opens this in a popup window and reads the
  // result via the opener — there we just close. The public pay page does a
  // full-page redirect (no opener), so there we show a confirmation instead of
  // bouncing the customer to the marketing homepage.
  const [popupFlow, setPopupFlow] = useState(true);

  useEffect(() => {
    if (window.opener) {
      window.close();
      return;
    }
    setPopupFlow(false);
  }, []);

  if (popupFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Payment completed. Closing window…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-8 text-center">
        <div className="text-3xl">✅</div>
        <h1 className="mt-3 text-lg font-semibold text-gray-900">
          Payment received
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;re confirming your payment now. You&apos;ll get a WhatsApp
          message from the store once your order is confirmed.
        </p>
        <p className="mt-1 text-xs text-gray-400">You can close this page.</p>
      </div>
    </div>
  );
}
