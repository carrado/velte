export type SubscriptionPlan = "monthly" | "annual" | null;

/** Product tier the user is subscribed to. */
export type SubscriptionTier = "basic" | "pro";

export type PaymentStatus = "success" | "failed" | "pending";

export interface SubscriptionTransaction {
  id: string;
  amount: number; // in kobo
  reference: string;
  status: PaymentStatus;
  paidAt: string | null;
}

export interface Subscription {
  isSubscribed: boolean;
  trialEndsAt: string | null;
  plan: SubscriptionPlan;
  /** Tier the user is subscribed to. Null while on trial / never subscribed. */
  tier: SubscriptionTier | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  transactions: SubscriptionTransaction[];
}

export interface InitializeSubscriptionResponse {
  authorization_url: string;
  reference: string;
}

export interface VerifySubscriptionResponse {
  isSubscribed: boolean;
  transactions: SubscriptionTransaction[];
}
