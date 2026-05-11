import { apiClient } from "@/lib/api";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import type {
  Subscription,
  InitializeSubscriptionResponse,
  VerifySubscriptionResponse,
} from "@/types/subscription";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function unwrap<T>(
  endpoint: string,
  init?: Parameters<typeof apiClient>[1],
): Promise<T> {
  const res = await apiClient<ApiEnvelope<T>>(endpoint, init);
  return res.data;
}

export async function getSubscriptionStatus(): Promise<Subscription> {
  const data = await unwrap<Subscription>("/subscription/status", {
    method: "GET",
  });

  useSubscriptionStore.getState().setSubscription(data);

  return data;
}

export async function initializeSubscription(
  plan: "monthly" | "annual" = "monthly",
): Promise<InitializeSubscriptionResponse> {
  return unwrap<InitializeSubscriptionResponse>("/subscription/initialize", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function verifySubscription(
  reference: string,
): Promise<VerifySubscriptionResponse> {
  const data = await unwrap<VerifySubscriptionResponse>(
    "/subscription/verify",
    {
      method: "POST",
      body: JSON.stringify({ reference }),
    },
  );

  /**
   * After verification, fetch fresh status again.
   * This gives the frontend:
   * - updated isSubscribed
   * - currentPeriodStart
   * - currentPeriodEnd
   * - latest transactions
   */
  await getSubscriptionStatus();

  return data;
}
