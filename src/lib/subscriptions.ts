// Display prices for the credits panel. The charge is computed again on
// velte-backend from config/prices.js — a client cannot name its own amount.

export const SUBSCRIPTION_PRICES_NGN = {
  buyer_premium: { monthly: 5_000, annual: 50_000 },
  vendor_enterprise: { monthly: 10_000, annual: 100_000 },
} as const;

export type SubscriptionInterval = "monthly" | "annual";
