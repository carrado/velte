"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
  Sparkles,
  Wifi,
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
import {
  annualMonthly,
  naira,
  planByTier,
  planTotal,
  plans,
} from "@/lib/plans";
import type { BillingPeriod, PricingPlan } from "@/types/pricing";
import type { SubscriptionTier } from "@/types/subscription";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  reference: string;
  status: "success" | "failed";
}

type SubStatus = "trial" | "active" | "expired";

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
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-dash-secondary font-bold border",
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
              "text-dash-title font-black leading-none",
              urgent ? "text-red-500" : "text-gray-900",
            )}
          >
            {days}
          </span>
          <span className="text-dash-micro font-semibold text-gray-400 uppercase tracking-wide mt-0.5">
            days
          </span>
        </div>
      </div>
      <p className="text-dash-caption text-gray-500 font-medium">{label}</p>
    </div>
  );
}

// ── Billing Period Toggle ─────────────────────────────────────────────────────

function PeriodToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
      {(["monthly", "annual"] as const).map((p) => {
        const active = period === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-dash-secondary font-semibold transition-colors cursor-pointer",
              active
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800",
            )}
          >
            {p === "monthly" ? "Monthly" : "Annual"}
            {p === "annual" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-dash-micro font-bold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-orange-100 text-orange-600",
                )}
              >
                -20%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Tier Card ─────────────────────────────────────────────────────────────────

function TierCard({
  plan,
  period,
  status,
  currentTier,
  loading,
  onSubscribe,
}: {
  plan: PricingPlan;
  period: BillingPeriod;
  status: SubStatus;
  currentTier: SubscriptionTier | null;
  loading: boolean;
  onSubscribe: (tier: SubscriptionTier, period: BillingPeriod) => void;
}) {
  const isCurrent = status === "active" && currentTier === plan.id;
  const total = planTotal(plan.monthlyPrice, period);
  const isAnnual = period === "annual";

  // Button label adapts to the user's situation.
  let label: string;
  if (isCurrent) label = `Renew · ${naira(total)}`;
  else if (status === "active") label = `Switch to ${plan.name}`;
  else label = `Subscribe · ${naira(total)}`;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden bg-white rounded-2xl border",
        isCurrent
          ? "border-emerald-300 ring-2 ring-emerald-200"
          : plan.popular
            ? "border-orange-200 ring-2 ring-orange-100"
            : "border-gray-200",
      )}
    >
      {/* Accent bar */}
      <div
        className={cn("h-1.5", isCurrent ? "bg-emerald-400" : "bg-orange-400")}
      />

      {/* Corner badge */}
      {(isCurrent || plan.badge) && (
        <div className="absolute top-1.5 right-0">
          <div
            className={cn(
              "text-white text-dash-micro font-black px-3 py-1 rounded-bl-xl uppercase tracking-wide",
              isCurrent ? "bg-emerald-500" : "bg-orange-500",
            )}
          >
            {isCurrent ? "Current Plan" : plan.badge}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 p-5 sm:p-6">
        <div className="flex items-center gap-1.5 mb-1.5">
          {plan.popular && <Sparkles size={15} className="text-orange-500" />}
          <p className="text-dash-body font-bold text-orange-600">
            {plan.name}
          </p>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-gray-900">
            {naira(total)}
          </span>
          <span className="text-dash-body text-gray-400 font-medium">
            {isAnnual ? "/ year" : "/ month"}
          </span>
        </div>
        <p className="text-dash-secondary text-orange-600 h-4 mt-1">
          {isAnnual
            ? `${naira(annualMonthly(plan.monthlyPrice))}/mo billed annually`
            : ""}
        </p>

        <p className="text-dash-secondary text-gray-500 leading-relaxed mt-2 mb-4">
          {plan.description}
        </p>

        <ul className="space-y-2 mb-6 flex-1">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-dash-secondary text-gray-700"
            >
              <CheckCircle2
                size={13}
                className="text-orange-500 flex-shrink-0 mt-0.5"
              />
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSubscribe(plan.id, period)}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-dash-body font-bold transition-all active:scale-[0.98] cursor-pointer mt-auto",
            isCurrent
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200",
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
              {label}
            </>
          )}
        </button>
      </div>
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
        <p className="text-dash-body font-semibold text-gray-900">
          {fmtAmount(item.amount)}
        </p>
        <p className="text-dash-secondary text-gray-400 mt-0.5 truncate">
          Ref: {item.reference}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-dash-secondary text-gray-500">
          {fmtDate(item.date)}
        </p>
        <span
          className={cn(
            "text-dash-micro font-bold uppercase tracking-wide",
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
// BILLING PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function BillingPage() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const { isLoading: isLoadingStatus } = useQuery({
    queryKey: queryKeys.subscription.status,
    queryFn: getSubscriptionStatus,
  });
  // Which tier's button is currently processing (null when idle).
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const history: PaymentHistoryItem[] =
    subscription?.transactions?.map((item) => ({
      id: item.id,
      date: item.paidAt ?? new Date().toISOString(),
      amount: item.amount,
      reference: item.reference,
      status: item.status === "pending" ? "failed" : item.status,
    })) ?? [];

  // ── Derive status ────────────────────────────────────────────────────────────
  const isSubscribed = subscription?.isSubscribed ?? false;
  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;

  const trialRemaining = trialEndsAt ? getTrialRemaining(trialEndsAt) : null;
  const isTrialExpired = trialRemaining?.expired ?? true;

  let status: "trial" | "active" | "expired" = "expired";
  if (isSubscribed) status = "active";
  else if (trialRemaining && !trialRemaining.expired) status = "trial";

  const trialDaysLeft = trialRemaining?.days ?? 0;
  const isUrgent = trialDaysLeft <= 2 && status === "trial";

  const accessEndDate = currentPeriodEnd
    ? fmtDate(currentPeriodEnd)
    : trialEndsAt && !isTrialExpired
      ? fmtDate(trialEndsAt)
      : null;

  // ── Current tier ───────────────────────────────────────────────────────────
  const currentTier = subscription?.tier ?? null;
  const currentPeriod: BillingPeriod =
    subscription?.plan === "annual" ? "annual" : "monthly";
  const currentPlan = status === "active" ? planByTier(currentTier) : null;
  const currentPlanName = currentPlan
    ? `Velte AI ${currentPlan.name}`
    : "Velte AI";
  const currentPrice = currentPlan
    ? `${naira(planTotal(currentPlan.monthlyPrice, currentPeriod))} / ${
        currentPeriod === "annual" ? "year" : "month"
      }`
    : `From ${naira(plans[0].monthlyPrice)} / month`;

  const handleSubscribe = async (
    tier: SubscriptionTier,
    billingPeriod: BillingPeriod,
  ) => {
    if (loadingTier) return;
    setLoadingTier(tier);
    try {
      const { authorization_url, reference } = await initializeSubscription(
        tier,
        billingPeriod,
      );
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
            setLoadingTier(null);
          }
        },
      });
      if (!popup) {
        toast.error("Please allow popups to complete payment.");
        setLoadingTier(null);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Checkout failed. Try again.";
      toast.error(msg);
      setLoadingTier(null);
    }
  };

  // ── Loading skeleton (only on first fetch, mirrors AISetupPage skeleton) ────

  if (isLoadingStatus && !subscription) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-24" />
        <div className="bg-white rounded-2xl border border-gray-200 p-8 h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-dash-body text-gray-500 px-5 sm:px-0">
        Manage your subscription and payment history
      </p>

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
              <h3 className="text-dash-heading font-bold text-gray-900">
                Subscription Status
              </h3>
              <p className="text-dash-secondary text-gray-400 mt-0.5">
                Your current plan and access details
              </p>
            </div>

            {/* Live badge — only for active */}
            {status === "active" && (
              <div className="ml-auto flex items-center gap-1.5 text-dash-body font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0">
                <Wifi size={11} />
                Live
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Status + dates */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <StatusBadge status={status} />
                <span className="text-dash-body font-bold text-gray-900">
                  {currentPlanName}
                </span>
              </div>

              {status === "trial" && trialRemaining && (
                <div className="space-y-1">
                  <p className="text-dash-secondary text-gray-500">
                    Trial access until{" "}
                    <span className="font-semibold text-gray-800">
                      {trialEndsAt ? fmtDate(trialEndsAt) : "—"}
                    </span>
                  </p>
                  {isUrgent && (
                    <div className="flex items-center gap-1.5 text-red-500">
                      <AlertTriangle size={11} />
                      <span className="text-dash-secondary font-semibold">
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
                <div className="flex items-center gap-2 text-dash-secondary text-gray-500">
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
                <div className="flex items-center gap-2 text-dash-secondary text-red-500 font-medium">
                  <XCircle size={12} />
                  <span>Your access has expired. Renew to continue.</span>
                </div>
              )}

              {/* Quick stats row */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-dash-secondary text-gray-500">
                  <Zap size={11} className="text-orange-400" />
                  <span>Unlimited conversations / mo</span>
                </div>
                <div className="flex items-center gap-1.5 text-dash-secondary text-gray-500">
                  <Receipt size={11} className="text-orange-400" />
                  <span>{currentPrice}</span>
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
                    totalDays={7}
                    label="trial days left"
                    urgent={isUrgent}
                  />
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ── Plans ── */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-dash-heading font-bold text-gray-900">
              {status === "active" ? "Your Plan" : "Choose a Plan"}
            </h3>
            <p className="text-dash-secondary text-gray-400 mt-0.5">
              {status === "active"
                ? "Renew, upgrade, or switch your subscription"
                : "Pick the plan that fits your business"}
            </p>
          </div>
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 items-stretch">
          {plans.map((plan) => (
            <TierCard
              key={plan.id}
              plan={plan}
              period={period}
              status={status}
              currentTier={currentTier}
              loading={loadingTier === plan.id}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      </div>

      {/* ── Payment History ── */}
      <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={17} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-dash-heading font-bold text-gray-900">
              Payment History
            </h3>
            <p className="text-dash-secondary text-gray-400 mt-0.5">
              All past transactions on your account
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <Receipt size={28} className="opacity-30" />
            <p className="text-dash-body font-medium">No payments yet</p>
            <p className="text-dash-secondary">
              Your transaction history will appear here
            </p>
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
