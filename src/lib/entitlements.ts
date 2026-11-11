// Who may do what (Phase 0.1 of docs/velte-platform-plan.md).
//
// CLIENT-SAFE — the UI reads this to hide or lock controls. The copy that
// actually ENFORCES a capability lives in velte-backend
// `src/config/entitlements.js`. Keep the two in step: a button that offers
// something the backend will 403 is worse than a locked one.
//
// Being entitled is not the same as it being free. Most of these still
// spend credits; this table only says whether the tier may attempt the
// action at all.

export const TIERS = [
  "guest",
  "buyer_basic",
  "buyer_premium",
  "vendor_basic",
  "vendor_enterprise",
] as const;

export type Tier = (typeof TIERS)[number];

export type Capability =
  | "search"
  | "photo_search"
  | "compare"
  | "shopping_plan"
  | "referrals"
  | "top_up"
  | "cart_checkout"
  | "create_request"
  | "switch_to_vendor"
  | "onboard_vendors"
  | "validate_vendor"
  | "review_vendor"
  | "review_product"
  | "gigs"
  | "list_products"
  | "receive_requests"
  | "lead_fee_exempt"
  | "hub_discover"
  | "place_advert"
  | "boost_advert"
  | "vendor_broadcast"
  | "analytics_insights"
  | "community_forum"
  | "hub_social_contact"
  | "buyer_place_advert"
  | "buyer_boost_advert"
  | "buyer_broadcast"
  | "favourite_vendor";

const ALL: Tier[] = [...TIERS];
const SIGNED_IN: Tier[] = [
  "buyer_basic",
  "buyer_premium",
  "vendor_basic",
  "vendor_enterprise",
];
const BUYERS: Tier[] = ["buyer_basic", "buyer_premium"];
const VENDORS: Tier[] = ["vendor_basic", "vendor_enterprise"];

export const CAPABILITIES: Record<Capability, readonly Tier[]> = {
  search: ALL,
  photo_search: ALL,
  compare: ALL,
  shopping_plan: SIGNED_IN,
  referrals: SIGNED_IN,
  top_up: SIGNED_IN,
  cart_checkout: BUYERS,
  // Q10: Premium buyers and Enterprise vendors only.
  create_request: ["buyer_premium", "vendor_enterprise"],
  switch_to_vendor: ["buyer_premium"],
  onboard_vendors: ["buyer_premium"],
  validate_vendor: ["buyer_premium"],
  // Order-backed reviews — any signed-up buyer who completed the order.
  review_vendor: BUYERS,
  review_product: BUYERS,
  gigs: ["buyer_premium"],
  list_products: VENDORS,
  receive_requests: VENDORS,
  // Q6: Enterprise vendors don't pay the per-lead fee.
  lead_fee_exempt: ["vendor_enterprise"],
  // Vendors Hub. Signed-up buyers and vendors. Guests sign up first.
  hub_discover: SIGNED_IN,
  place_advert: VENDORS,
  boost_advert: VENDORS,
  vendor_broadcast: VENDORS,
  analytics_insights: ["vendor_enterprise"],
  // Q10: General Velte Community Hub — Enterprise Vendors and Premium Buyers.
  community_forum: ["buyer_premium", "vendor_enterprise"],
  // Buyer Premium + Vendor Enterprise. Basic buyers/vendors stay gated.
  hub_social_contact: ["buyer_premium", "vendor_enterprise"],
  buyer_place_advert: ["buyer_premium"],
  buyer_boost_advert: ["buyer_premium"],
  buyer_broadcast: ["buyer_premium"],
  favourite_vendor: ["buyer_premium"],
};

export function can(tier: Tier, capability: Capability): boolean {
  // A vendor is automatically a premium buyer already, granting all buyer_premium privileges
  if (
    (tier === "vendor_basic" || tier === "vendor_enterprise") &&
    CAPABILITIES[capability].includes("buyer_premium")
  ) {
    return true;
  }
  return CAPABILITIES[capability].includes(tier);
}

/** Signed-up Buyer Basic: 20 free credits per Lagos day. Guests get none
 *  (Q4). */
export const DAILY_FREE_CREDITS = 20;

/** PLACEHOLDER — Q5 sets the 5-hour wait, not the window size. */
export const PREMIUM_WINDOW_CREDITS = 60;
export const PREMIUM_WINDOW_HOURS = 5;

export interface AllowanceSummary {
  kind: "daily" | "window";
  credits: number;
  eligible: boolean;
  reason: string | null;
  used: number;
  remaining: number;
  resetsAt: string | null;
}
