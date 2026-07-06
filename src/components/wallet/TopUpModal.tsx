"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { walletApi, LEAD_COST_KOBO } from "@/services/wallet";

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];
const MIN_TOPUP_NAIRA = 1000;
const LEAD_COST_NAIRA = LEAD_COST_KOBO / 100;

export default function TopUpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const numericAmount = Number(amount);
  const isValid =
    Number.isFinite(numericAmount) && numericAmount >= MIN_TOPUP_NAIRA;
  const estimatedLeads =
    numericAmount > 0 ? Math.floor(numericAmount / LEAD_COST_NAIRA) : 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const { authorizationUrl } =
        await walletApi.initializeTopup(numericAmount);
      // Full-page redirect to Paystack's hosted checkout — same pattern as the
      // rest of the app's payment flows (card data never touches our page).
      window.location.href = authorizationUrl;
    } catch (err) {
      setSubmitting(false);
      toast.error(
        err instanceof Error ? err.message : "Failed to start top-up",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-dash-heading font-semibold text-gray-900">
            Top Up Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4">
          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1.5">
              Amount (₦)
            </label>
            <input
              type="number"
              min={MIN_TOPUP_NAIRA}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-dash-body focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            />
            {!isValid && amount.trim() !== "" && (
              <p className="text-dash-caption text-red-500 mt-1">
                Minimum top-up is ₦1,000.
              </p>
            )}
          </div>

          {numericAmount > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
              <span className="text-dash-caption text-orange-700">
                Estimated leads at ₦{LEAD_COST_NAIRA.toLocaleString("en-NG")}
                /lead
              </span>
              <span className="text-dash-body font-bold text-orange-600">
                ≈ {estimatedLeads.toLocaleString("en-NG")}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="px-3 py-1.5 text-dash-secondary font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors cursor-pointer"
              >
                ₦{v.toLocaleString("en-NG")}
              </button>
            ))}
          </div>

          <p className="text-dash-secondary text-gray-400">
            You&apos;ll be redirected to Paystack to complete payment by card or
            bank transfer.
          </p>

          <div className="flex items-start gap-2 text-dash-caption text-gray-400">
            <ShieldCheck size={14} className="text-green-500 mt-0.5 shrink-0" />
            <p>
              Your card details are handled securely by Paystack — they never
              touch or get stored on our servers. See our{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-orange-600 hover:text-orange-700 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-dash-body font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-dash-body font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Continue to Paystack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
