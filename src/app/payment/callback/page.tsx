// app/payment/callback/page.tsx

"use client";

import { useEffect } from "react";

export default function PaymentCallbackPage() {
  useEffect(() => {
    if (window.opener) {
      window.close();
      return;
    }

    window.location.href = "/";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Payment completed. Closing window...
    </div>
  );
}
