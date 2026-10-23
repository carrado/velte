"use client";

import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";

// The buyer Hub is a buyer page. A guest, or a vendor without a buyer
// session, stops here.
export function BuyerHubGate() {
  return (
    <div className="max-w-md mx-auto mt-16 bg-surface border border-gray-200 rounded-2xl p-8 text-center">
      <h2 className="text-lg font-bold text-ink tracking-tight">
        Sign in to open the Hub
      </h2>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">
        The Vendor Hub is for buyers with an account. Sign in to see the
        businesses, their listings, and their promotions.
      </p>
      <div className="mt-5">
        <GoogleSignInButton onSignedIn={() => window.location.reload()} />
      </div>
    </div>
  );
}
