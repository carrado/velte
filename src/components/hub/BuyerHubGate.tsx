"use client";

import Link from "next/link";
import { ArrowRight, SignIn } from "@phosphor-icons/react";

// The buyer Hub is a buyer page. A guest, or a vendor without a buyer
// session, stops here.
export function BuyerHubGate() {
  return (
    <div className="max-w-md mx-auto mt-16 bg-surface border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-4 text-orange-500">
        <SignIn size={24} weight="bold" />
      </div>
      <h2 className="text-xl font-bold text-ink tracking-tight">
        Sign in to open the Hub
      </h2>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">
        The Vendor Hub is for buyers with an account. Sign in to see the
        businesses, their listings, and their promotions.
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/auth/login?redirect=/hub"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 text-sm font-semibold shadow-md shadow-orange-500/20 transition-colors"
        >
          <span>Sign in to Velte</span>
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
