"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { storeReferralCode } from "@/lib/referralCode";

// Captures ?ref=CODE from the URL into localStorage the moment any page is
// visited with it — mounted once in the root layout (not just the signup
// page) since a shared link can land anywhere and the invited vendor may
// not complete signup for days. useSearchParams requires a Suspense
// boundary in the App Router (same pattern as payment/callback/page.tsx).
function ReferralCaptureInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) storeReferralCode(ref);
  }, [searchParams]);

  return null;
}

export default function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}
