"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { openPaystackPopup } from "@/lib/paystack";
import {
  initializeSubscription,
  verifySubscription,
} from "@/services/subscription";

export default function TrialLockModal() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", blockKeys, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", blockKeys, true);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleSubscribe = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { authorization_url, reference } = await initializeSubscription();
      const popup = openPaystackPopup({
        url: authorization_url,
        onClose: async () => {
          try {
            const result = await verifySubscription(reference);
            if (result.isSubscribed) {
              toast.success("Subscription activated. Welcome back!");
            } else {
              toast.error("Payment not completed. Please try again.");
            }
          } catch {
            toast.error(
              "We couldn't verify your payment. Please contact support.",
            );
          } finally {
            setLoading(false);
          }
        },
      });
      if (!popup) {
        toast.error("Please allow popups to complete payment.");
        setLoading(false);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Couldn't start checkout. Try again.";
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-lock-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock size={28} className="text-orange-500" />
        </div>
        <h2
          id="trial-lock-title"
          className="text-xl font-bold text-[#023337] mb-2"
        >
          Your free trial has ended
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Subscribe to continue using your AI assistant and access all features
          of your dashboard.
        </p>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? "Starting checkout…" : "Subscribe now"}
        </button>
      </div>
    </div>
  );
}
