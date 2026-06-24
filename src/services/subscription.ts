import { api } from "@/lib/api-client";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import type {
  Subscription,
  SubscriptionTier,
  InitializeSubscriptionResponse,
  VerifySubscriptionResponse,
} from "@/types/subscription";

type BillingPeriod = "monthly" | "annual";

export async function getSubscriptionStatus(): Promise<Subscription> {
  const data = await api.get<Subscription>("/api/subscription/status");
  useSubscriptionStore.getState().setSubscription(data);
  return data;
}

export async function initializeSubscription(
  tier: SubscriptionTier,
  plan: BillingPeriod = "monthly",
): Promise<InitializeSubscriptionResponse> {
  return api.post<InitializeSubscriptionResponse>(
    "/api/subscription/initialize",
    { tier, plan },
  );
}

export async function verifySubscription(
  reference: string,
): Promise<VerifySubscriptionResponse> {
  const data = await api.post<VerifySubscriptionResponse>(
    "/api/subscription/verify",
    { reference },
  );

  /**
   * After verification, fetch fresh status again so the frontend gets the
   * updated isSubscribed / period bounds / latest transactions.
   */
  await getSubscriptionStatus();

  return data;
}
