/**
 * Checks whether a vendor or user profile is on the Enterprise plan.
 * Pure TypeScript helper function safe for both Server and Client Components.
 */
export function isEnterpriseVendor(vendor: unknown): boolean {
  if (!vendor || typeof vendor !== "object") return false;
  const v = vendor as {
    tier?: string;
    plan?: string;
    isEnterprise?: boolean;
    enterprise?: boolean;
    subscription?: { plan?: string; status?: string };
    store?: {
      tier?: string;
      plan?: string;
      isEnterprise?: boolean;
      enterprise?: boolean;
    };
  };
  const subStatus = v.subscription?.status;
  const isSubActive =
    v.subscription?.plan === "vendor_enterprise" &&
    (subStatus === "active" ||
      subStatus === "trialing" ||
      subStatus === "past_due" ||
      subStatus === "cancelled");

  return Boolean(
    v.tier === "vendor_enterprise" ||
    v.plan === "vendor_enterprise" ||
    v.isEnterprise === true ||
    v.enterprise === true ||
    isSubActive ||
    v.store?.tier === "vendor_enterprise" ||
    v.store?.plan === "vendor_enterprise" ||
    v.store?.isEnterprise === true ||
    v.store?.enterprise === true,
  );
}

/**
 * Checks whether a buyer or user profile is on the Premium plan.
 */
export function isPremiumBuyer(buyer: unknown): boolean {
  if (!buyer || typeof buyer !== "object") return false;
  const b = buyer as {
    tier?: string;
    plan?: string;
    isPremium?: boolean;
    premium?: boolean;
    role?: string;
    subscription?: { plan?: string; status?: string };
  };
  const subStatus = b.subscription?.status;
  const isSubActive =
    b.subscription?.plan === "buyer_premium" &&
    (subStatus === "active" ||
      subStatus === "trialing" ||
      subStatus === "past_due" ||
      subStatus === "cancelled");

  return Boolean(
    b.tier === "buyer_premium" ||
    b.plan === "buyer_premium" ||
    b.isPremium === true ||
    b.premium === true ||
    isSubActive,
  );
}

/**
 * Checks whether a user (Enterprise Vendor or Premium Buyer) is eligible to access
 * the Velte Community Hub.
 */
export function isCommunityEligible(
  user: unknown,
  context?: { enterprise?: boolean; premium?: boolean } | null,
): boolean {
  return (
    isEnterpriseVendor(user) ||
    isPremiumBuyer(user) ||
    context?.enterprise === true ||
    context?.premium === true
  );
}
