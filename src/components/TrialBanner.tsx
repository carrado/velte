"use client";

import { useEffect, useState } from "react";
import { Zap, X } from "lucide-react";
import { toast } from "sonner";
import { getTrialRemaining } from "@/lib/trial";
import { openPaystackPopup } from "@/lib/paystack";
import { useTrialStore } from "@/store/trialStore";
import {
  initializeSubscription,
  verifySubscription,
} from "@/services/subscription";

interface TrialBannerProps {
  trialEndsAt: string;
}

export default function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const [remaining, setRemaining] = useState(() =>
    getTrialRemaining(trialEndsAt),
  );
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setRemaining(getTrialRemaining(trialEndsAt));
    const id = setInterval(
      () => setRemaining(getTrialRemaining(trialEndsAt)),
      60_000,
    );
    return () => clearInterval(id);
  }, [trialEndsAt]);

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
              toast.success("Subscription activated. Welcome aboard!");
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

  const setUrgency = useTrialStore((s) => s.setUrgency);

  // Urgency level: urgent = ≤1 day, medium = ≤3 days, low = otherwise
  const isUrgent = remaining.days <= 1;
  const isMedium = !isUrgent && remaining.days <= 3;

  useEffect(() => {
    setUrgency(isMedium, isUrgent);
    return () => setUrgency(false, false);
  }, [isMedium, isUrgent, setUrgency]);

  if (remaining.expired || dismissed) return null;

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-center justify-between gap-3
        px-4 sm:px-5 py-2.5
        text-sm font-medium
        transition-all duration-500
        ${
          isUrgent
            ? "bg-red-600 text-white"
            : isMedium
              ? "bg-amber-500 text-white"
              : "bg-[#0f172a] text-white"
        }
      `}
    >
      {/* Subtle animated shimmer line at bottom */}
      <span
        aria-hidden
        className={`
          pointer-events-none absolute bottom-0 left-0 h-[2px] w-full
          ${
            isUrgent
              ? "bg-gradient-to-r from-transparent via-red-200 to-transparent animate-shimmer"
              : isMedium
                ? "bg-gradient-to-r from-transparent via-amber-200 to-transparent animate-shimmer"
                : "bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer"
          }
        `}
        style={{
          backgroundSize: "200% 100%",
          animation: "shimmer 2.4s linear infinite",
        }}
      />

      {/* Left — icon + message */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`
            flex-shrink-0 flex items-center justify-center
            w-6 h-6 rounded-full
            ${isUrgent ? "bg-red-500/40" : isMedium ? "bg-amber-400/40" : "bg-emerald-500/20"}
          `}
        >
          <Zap
            size={13}
            className={
              isUrgent
                ? "text-red-100"
                : isMedium
                  ? "text-amber-100"
                  : "text-emerald-400"
            }
            fill="currentColor"
          />
        </span>

        <p className="truncate leading-snug">
          {isUrgent ? (
            <>
              <span className="font-bold">Trial ending soon —</span>{" "}
              {remaining.days === 0
                ? `${remaining.hours}h left`
                : `${remaining.days}d ${remaining.hours}h left`}
              <span className="hidden sm:inline text-white/80">
                {" "}
                · Subscribe now to avoid losing access.
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold">
                {remaining.days}d {remaining.hours}h
              </span>{" "}
              <span
                className={
                  isUrgent || isMedium ? "text-white/90" : "text-white/70"
                }
              >
                remaining on your free trial.
              </span>
              <span className="hidden sm:inline text-white/60">
                {" "}
                Subscribe to keep everything running.
              </span>
            </>
          )}
        </p>
      </div>

      {/* Right — CTA + dismiss */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`
            relative text-sm font-semibold px-4 py-1.5 rounded-md
            transition-all duration-150 active:scale-95
            disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
            ${
              isUrgent
                ? "bg-white text-red-600 hover:bg-red-50 shadow-md shadow-red-900/30"
                : isMedium
                  ? "bg-white text-amber-600 hover:bg-amber-50 shadow-md shadow-amber-900/20"
                  : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-md shadow-emerald-900/30"
            }
          `}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span
                className={`
                  inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin
                `}
              />
              <span>Loading…</span>
            </span>
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}
