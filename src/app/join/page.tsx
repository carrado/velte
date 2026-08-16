import { redirect } from "next/navigation";

// /join used to be the buyer-vs-vendor chooser page, then (2026-08-15) a
// forward into the unified /auth/signup's own Buyer/Vendor toggle. As of
// 2026-08-16, /auth/signup is vendor-only again — buyers don't "join" via a
// page at all (see that page's own comment) — so this is now effectively
// just the vendor signup's canonical short URL. Kept as a redirect (not
// merged into /auth/signup directly) purely so nothing that already links
// to /join breaks.
export default async function JoinPage({
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
  redirect(`/auth/signup${suffix ? `?${suffix}` : ""}`);
}
