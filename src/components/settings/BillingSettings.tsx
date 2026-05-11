"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  Receipt,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTrialRemaining } from "@/lib/trial";
import { openPaystackPopup } from "@/lib/paystack";
import {
  getSubscriptionStatus,
  initializeSubscription,
  verifySubscription,
} from "@/services/subscription";
import { useSubscriptionStore } from "@/store/subscriptionStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  reference: string;
  status: "success" | "failed";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "trial" | "active" | "expired" }) {
  const map = {
    trial: {
      label: "Free Trial",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-400",
    },
    active: {
      label: "Active",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-400",
    },
    expired: {
      label: "Expired",
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-400",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
        s.bg,
        s.text,
        s.border,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", s.dot)} />
      {s.label}
    </span>
  );
}

// ── Countdown Ring ────────────────────────────────────────────────────────────

function CountdownRing({
  days,
  totalDays,
  label,
  urgent,
}: {
  days: number;
  totalDays: number;
  label: string;
  urgent: boolean;
}) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, days / totalDays));
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-gray-100"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className={urgent ? "text-red-400" : "text-orange-400"}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-xl font-black leading-none",
              urgent ? "text-red-500" : "text-gray-900",
            )}
          >
            {days}
          </span>
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">
            days
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 font-medium">{label}</p>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
  onSubscribe,
  loading,
  isRenewal,
}: {
  onSubscribe: () => void;
  loading: boolean;
  isRenewal: boolean;
}) {
  const perks = [
    "1 WhatsApp number",
    "Unlimited AI conversations / month",
    "Unlimited products",
    "Negotiation & discount controls",
    "Accept Payments",
    "Issue Invoices and Receipts",
    "PWA Notifications",
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5">
      {/* Corner ribbon */}
      <div className="absolute top-0 right-0">
        <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wide">
          MVP Plan
        </div>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h4 className="text-sm font-black text-gray-900">Velte AI PRO</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Everything you need to run AI sales
          </p>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-4">
        <span className="text-3xl font-black text-gray-900">₦8,500</span>
        <span className="text-sm text-gray-400 font-medium">/ month</span>
      </div>

      <ul className="space-y-2 mb-5">
        {perks.map((p) => (
          <li key={p} className="flex items-center gap-2 text-xs text-gray-700">
            <CheckCircle2 size={13} className="text-orange-500 flex-shrink-0" />
            {p}
          </li>
        ))}
      </ul>

      <button
        onClick={onSubscribe}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer",
          "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {loading ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CreditCard size={14} />
            {isRenewal ? "Renew · ₦8,500" : "Subscribe · ₦8,500"}
          </>
        )}
      </button>

      <p className="text-[10px] text-gray-400 text-center mt-2">
        One-time monthly payment · No automatic charges
      </p>
    </div>
  );
}

// ── Payment History Row ───────────────────────────────────────────────────────

function PaymentRow({ item }: { item: PaymentHistoryItem }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
          item.status === "success" ? "bg-emerald-50" : "bg-red-50",
        )}
      >
        {item.status === "success" ? (
          <CheckCircle2 size={14} className="text-emerald-500" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {fmtAmount(item.amount)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          Ref: {item.reference}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-500">{fmtDate(item.date)}</p>
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wide",
            item.status === "success" ? "text-emerald-500" : "text-red-400",
          )}
        >
          {item.status}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BILLING PANEL
// ══════════════════════════════════════════════════════════════════════════════

export function BillingSettingsPanel() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);

  const history: PaymentHistoryItem[] =
    subscription?.transactions?.map((item) => ({
      id: item.id,
      date: item.paidAt ?? new Date().toISOString(),
      amount: item.amount,
      reference: item.reference,
      status: item.status === "pending" ? "failed" : item.status,
    })) ?? [];

  useEffect(() => {
    if (!subscription) {
      setLoadingStatus(true);
      getSubscriptionStatus().finally(() => setLoadingStatus(false));
    }
  }, [subscription]);

  // Derive status
  const isSubscribed = subscription?.isSubscribed ?? false;
  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;

  const trialRemaining = trialEndsAt ? getTrialRemaining(trialEndsAt) : null;
  const isTrialExpired = trialRemaining?.expired ?? true;

  let status: "trial" | "active" | "expired" = "expired";
  if (isSubscribed) status = "active";
  else if (trialRemaining && !trialRemaining.expired) status = "trial";

  // Days remaining display
  const trialDaysLeft = trialRemaining?.days ?? 0;
  const isUrgent = trialDaysLeft <= 2 && status === "trial";

  // Access end date for active subscribers
  const accessEndDate = currentPeriodEnd
    ? fmtDate(currentPeriodEnd)
    : trialEndsAt && !isTrialExpired
      ? fmtDate(trialEndsAt)
      : null;

  const handleSubscribe = async () => {
    if (loadingPay) return;
    setLoadingPay(true);
    try {
      const { authorization_url, reference } = await initializeSubscription();
      const popup = openPaystackPopup({
        url: authorization_url,
        onClose: async () => {
          try {
            const result = await verifySubscription(reference);
            if (result.isSubscribed) {
              toast.success("Payment confirmed. Your plan is now active!");
            } else {
              toast.error("Payment not completed. Please try again.");
            }
          } catch {
            toast.error("Could not verify payment. Contact support.");
          } finally {
            setLoadingPay(false);
          }
        },
      });
      if (!popup) {
        toast.error("Please allow popups to complete payment.");
        setLoadingPay(false);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Checkout failed. Try again.";
      toast.error(msg);
      setLoadingPay(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
        <RefreshCw size={16} className="animate-spin" />
        <span className="text-sm">Loading billing information…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Current Status Card ── */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 overflow-hidden">
        {/* Accent bar */}
        <div
          className={cn(
            "h-1.5",
            status === "active"
              ? "bg-emerald-400"
              : status === "trial"
                ? isUrgent
                  ? "bg-red-400"
                  : "bg-orange-400"
                : "bg-gray-300",
          )}
        />
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                status === "active"
                  ? "bg-emerald-50"
                  : status === "trial"
                    ? "bg-orange-50"
                    : "bg-gray-100",
              )}
            >
              <CreditCard
                size={17}
                className={
                  status === "active"
                    ? "text-emerald-500"
                    : status === "trial"
                      ? "text-orange-500"
                      : "text-gray-400"
                }
              />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-gray-900">
                Subscription Status
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Your current plan and access details
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Status + dates */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <StatusBadge status={status} />
                <span className="text-sm font-bold text-gray-900">
                  Velte AI Pro
                </span>
              </div>

              {status === "trial" && trialRemaining && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    Trial access until{" "}
                    <span className="font-semibold text-gray-800">
                      {trialEndsAt ? fmtDate(trialEndsAt) : "—"}
                    </span>
                  </p>
                  {isUrgent && (
                    <div className="flex items-center gap-1.5 text-red-500">
                      <AlertTriangle size={11} />
                      <span className="text-xs font-semibold">
                        Trial ends in{" "}
                        {trialDaysLeft === 0
                          ? `${trialRemaining.hours}h`
                          : `${trialDaysLeft}d ${trialRemaining.hours}h`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {status === "active" && accessEndDate && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} className="text-gray-400" />
                  <span>
                    Access until{" "}
                    <span className="font-semibold text-gray-800">
                      {accessEndDate}
                    </span>
                  </span>
                </div>
              )}

              {status === "expired" && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                  <XCircle size={12} />
                  <span>Your access has expired. Renew to continue.</span>
                </div>
              )}

              {/* Quick stats row */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Zap size={11} className="text-orange-400" />
                  <span>Unlimited conversations / mo</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Receipt size={11} className="text-orange-400" />
                  <span>₦8,500 / month</span>
                </div>
              </div>
            </div>

            {/* Countdown ring — only during trial */}
            {status === "trial" &&
              trialRemaining &&
              !trialRemaining.expired && (
                <div className="flex-shrink-0 flex justify-center">
                  <CountdownRing
                    days={trialDaysLeft}
                    totalDays={14}
                    label="trial days left"
                    urgent={isUrgent}
                  />
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ── Plan Card — shown when not active ── */}
      {status !== "active" && (
        <PlanCard
          onSubscribe={handleSubscribe}
          loading={loadingPay}
          isRenewal={status === "expired"}
        />
      )}

      {/* ── Renew early — shown when active ── */}
      {status === "active" && (
        <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-gray-900">
                Renew Early
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Extend your access before it expires
              </p>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={loadingPay}
              className={cn(
                "flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {loadingPay ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <>
                  <RefreshCw size={13} />
                  Renew · ₦8,500
                  <ChevronRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={17} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-gray-900">
              Payment History
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              All past transactions on your account
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <Receipt size={28} className="opacity-30" />
            <p className="text-sm font-medium">No payments yet</p>
            <p className="text-xs">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((item) => (
              <PaymentRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
