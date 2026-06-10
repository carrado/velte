import type { BillingPeriod, PricingPlan } from "@/types/pricing";
import type { SubscriptionTier } from "@/types/subscription";

/** Annual discount applied to (monthlyPrice × 12). */
export const ANNUAL_DISCOUNT = 0.2;

/**
 * Single source of truth for the subscription plans.
 * Consumed by the landing pricing cards and the in-app billing page.
 */
export const plans: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 9000,
    description:
      "An AI agent that handles every WhatsApp conversation and closes the sale for you.",
    features: [
      "AI sales agent on 1 WhatsApp number",
      "24/7 product Q&A and replies",
      "Smart price negotiation",
      "Real-time inventory checks",
      "Instant payment links",
      "Order capture & tracking",
      "Sales analytics dashboard",
      "Email support",
    ],
    cta: "Start with Basic",
    href: "/auth/signup",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 14000,
    description:
      "Everything in Basic, plus an AI that creates and posts your ads for you.",
    features: [
      "Everything in Basic",
      "AI ad generation — copy & creatives",
      "AI ad posting assistance",
      "AI campaign recommendations",
      "Multi-channel ad scheduling",
      "Priority support",
    ],
    cta: "Go Pro",
    href: "/auth/signup",
    popular: true,
    badge: "Most Popular",
  },
];

/** Format a Naira amount with thousands separators. */
export const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

/** Annual total = monthly × 12, less the annual discount. */
export const annualTotal = (monthlyPrice: number) =>
  Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT));

/** Effective monthly price when billed annually. */
export const annualMonthly = (monthlyPrice: number) =>
  Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT));

/** Charged amount for a plan over the chosen billing period. */
export const planTotal = (monthlyPrice: number, period: BillingPeriod) =>
  period === "annual" ? annualTotal(monthlyPrice) : monthlyPrice;

/** Look up a plan by its tier id. */
export const planByTier = (tier: SubscriptionTier | null) =>
  tier ? (plans.find((p) => p.id === tier) ?? null) : null;
