"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { getSubscriptionStatus } from "@/services/subscription";
import { getTrialRemaining } from "@/lib/trial";
import TrialBanner from "./TrialBanner";
import AccountLockModal from "./AccountLockModal";

export default function TrialGate() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const hasFetched = useSubscriptionStore((s) => s.hasFetched);
  const pathname = usePathname();
  const [, force] = useState(0);

  useEffect(() => {
    getSubscriptionStatus().catch(() => {
      // Status couldn't be retrieved — fail open and let the user keep working
      // rather than locking them out on a transient error.
    });
  }, []);

  // Fire a single timeout exactly when the trial elapses so the banner flips
  // to the lock modal without a polling loop.
  useEffect(() => {
    if (!subscription?.trialEndsAt || subscription.isSubscribed) return;
    const msUntilExpiry =
      new Date(subscription.trialEndsAt).getTime() - Date.now();
    if (msUntilExpiry <= 0) return;
    const id = setTimeout(() => force((n) => n + 1), msUntilExpiry + 500);
    return () => clearTimeout(id);
  }, [subscription?.trialEndsAt, subscription?.isSubscribed]);

  if (!hasFetched || !subscription) return null;

  // The billing page is the one place a locked-out user must still reach to
  // renew or subscribe, so never render the lock over it.
  const onBilling = pathname.split("/")[2] === "billing";

  // Treat the subscription as active only while the current paid period is
  // still running. A lapsed period (expired and not renewed) locks the account.
  const periodActive =
    subscription.isSubscribed &&
    (!subscription.currentPeriodEnd ||
      new Date(subscription.currentPeriodEnd).getTime() > Date.now());
  if (periodActive) return null;

  // A user who previously paid (has a tier or a billing period on record) is in
  // the "subscription expired" state rather than the "trial ended" state.
  const hadPaidPlan = !!subscription.tier || !!subscription.currentPeriodEnd;
  if (hadPaidPlan) {
    if (onBilling) return null;
    return (
      <AccountLockModal
        reason="plan"
        tier={subscription.tier}
        plan={subscription.plan}
      />
    );
  }

  if (!subscription.trialEndsAt) return null;

  const { expired } = getTrialRemaining(subscription.trialEndsAt);
  if (expired) {
    if (onBilling) return null;
    return <AccountLockModal reason="trial" />;
  }

  return <TrialBanner trialEndsAt={subscription.trialEndsAt} />;
}
