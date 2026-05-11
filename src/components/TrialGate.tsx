"use client";

import { useEffect, useState } from "react";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { getSubscriptionStatus } from "@/services/subscription";
import { getTrialRemaining } from "@/lib/trial";
import TrialBanner from "./TrialBanner";
import TrialLockModal from "./TrialLockModal";

export default function TrialGate() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const hasFetched = useSubscriptionStore((s) => s.hasFetched);
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
  if (subscription.isSubscribed) return null;
  if (!subscription.trialEndsAt) return null;

  const { expired } = getTrialRemaining(subscription.trialEndsAt);
  if (expired) return <TrialLockModal />;
  return <TrialBanner trialEndsAt={subscription.trialEndsAt} />;
}
