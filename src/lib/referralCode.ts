// A referral link can point anywhere (marketing homepage, a product page,
// directly at signup) and the invited vendor may not finish signing up the
// same day — so the code has to be captured wherever it's first seen and
// survive until signup, not just live as a query param on one page.
export const REFERRAL_CODE_STORAGE_KEY = "velte_referral_code";

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
}

export function storeReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return;
  localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, trimmed);
}

// Called after a successful signup — the code has done its job.
export function clearStoredReferralCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
}
