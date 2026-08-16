import { redirect } from "next/navigation";

// Legacy direct-URL shim — /buyer/auth/login used to be its own phone+OTP
// screen, then briefly forwarded into the unified vendor/buyer /auth/login
// (2026-08-15). As of the 2026-08-16 "buyers don't sign up" decision,
// /auth/login is vendor territory again (password-based, see that page's
// own comment) — this now forwards to the real buyer identity screen,
// /buyer/auth, instead. See that file's own comment for what it renders.
export default async function BuyerLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(`/buyer/auth${suffix ? `?${suffix}` : ""}`);
}
