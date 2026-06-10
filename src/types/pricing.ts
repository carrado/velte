import type { SubscriptionTier } from "./subscription";

export type BillingPeriod = "monthly" | "annual";

export interface PricingPlan {
  /** Tier id, matched against the user's active subscription. */
  id: SubscriptionTier;
  name: string;
  /** Price per month in Naira. Annual = monthlyPrice × 12 − 20%. */
  monthlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular: boolean;
  badge?: string;
}

export interface PricingComparisonRow {
  feature: string;
  basic: boolean | string;
  pro: boolean | string;
  highlight?: boolean;
}

export interface PricingFaq {
  q: string;
  a: string;
}
