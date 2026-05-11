export type SubscriptionPlan = "monthly" | "annual" | null;

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
