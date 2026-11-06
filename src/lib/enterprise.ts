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
