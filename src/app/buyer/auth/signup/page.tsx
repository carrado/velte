import { redirect } from "next/navigation";

// Legacy direct-URL shim — /buyer/auth/signup used to forward into the
// unified /auth/signup's Buyer tab (BuyerSignupForm, a full name/email/
// phone/password form). That tab is gone as of the 2026-08-16 "buyers
// don't sign up" decision — /auth/signup is vendor-only now (see that
// page's own comment). There's no longer a meaningful distinction between
// a buyer "signing up" and "logging in" (phone + OTP is the whole account
// either way), so this just forwards to the same place /buyer/auth/login
// does: the real buyer identity screen at /buyer/auth. `type=buyer` is no
// longer a param that means anything and isn't set here.
export default async function BuyerSignupRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && key !== "type") qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(`/buyer/auth${suffix ? `?${suffix}` : ""}`);
}
