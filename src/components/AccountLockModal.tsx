"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { planByTier } from "@/lib/plans";
import type { SubscriptionPlan, SubscriptionTier } from "@/types/subscription";

interface AccountLockModalProps {
  /** Why the account is locked. */
  reason: "trial" | "plan";
  /** The expired paid tier — only relevant when reason === "plan". */
  tier?: SubscriptionTier | null;
  /** Billing period of the expired plan — only relevant when reason === "plan". */
  plan?: SubscriptionPlan;
}

export default function AccountLockModal({
  reason,
  tier,
  plan,
}: AccountLockModalProps) {
  const router = useRouter();
  const pathname = usePathname();

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

  // Route to the billing page where the user renews / picks a plan and pays.
  const handleRenew = () => {
    const userId = pathname.split("/")[1];
    router.push(`/${userId}/billing`);
  };

  const isTrial = reason === "trial";
  const planName = planByTier(tier ?? null)?.name;
  const periodLabel =
    plan === "annual" ? "annual" : plan === "monthly" ? "monthly" : null;

  let title: string;
  let description: string;
  let cta: string;

  if (isTrial) {
    title = "Your free trial has ended";
    description =
      "Your free trial is over. Subscribe to a plan to keep your AI assistant running and access all features of your dashboard.";
    cta = "Choose a plan";
  } else {
    title = planName
      ? `Your ${planName} plan has expired`
      : "Your subscription has expired";
    description = planName
      ? `Your ${planName}${periodLabel ? ` ${periodLabel}` : ""} subscription has expired. Renew it to restore your AI assistant and regain access to your dashboard.`
      : "Your subscription has expired. Renew it to restore your AI assistant and regain access to your dashboard.";
    cta = "Renew subscription";
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-lock-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock size={28} className="text-orange-500" />
        </div>
        <h2
          id="account-lock-title"
          className="text-xl font-bold text-[#023337] mb-2"
        >
          {title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          {description}
        </p>
        <button
          onClick={handleRenew}
          className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
