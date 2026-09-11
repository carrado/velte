import { backendData } from "@/lib/server/backend";

// The network-level backstop behind a guest's own browser-side allowance
// (2026-09-05). See velte-backend's GuestIpUsage.model.js for the full
// reasoning — the short version: a guest's own credit count lives in their
// browser (lib/guestCredits.ts) and resets the instant it's cleared, which
// protects nothing against someone doing that on purpose. This is what
// still remembers, because it was never inside their browser to begin with.
//
// Deliberately per ADDRESS, never per browser, device, or person — it does
// not try to recognise anyone, only to notice when an unusual amount of
// guest activity has come from one shared connection. That is a completely
// different, and much less invasive, thing than device fingerprinting: it
// never tries to survive a deliberate data clear by re-identifying a
// specific human, it just throttles a shared resource, the same way any
// ordinary rate limit does.
//
// BEST-EFFORT, exactly like every other cross-service check in this
// codebase (see helpers/marketCheck.js on velte-backend for the same
// pattern the other way round): a slow or unreachable ledger must never
// turn into a refused search. Fails OPEN.
const TIMEOUT_MS = 4000;

/**
 * Whether this address may take another guest turn today.
 *
 * `ip` is the value the CALLER extracted from the real incoming request
 * (see guestIpFromRequest below) — this function does no extraction of its
 * own, so it never has to guess which header actually carried the real
 * address.
 */
export async function checkGuestNetworkAllowance(
  ip: string | null,
): Promise<boolean> {
  if (!ip) return true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const data = await backendData<{ allowed: boolean; count: number }>(
      "/credits/guest-usage",
      { method: "POST", body: { ip }, signal: controller.signal },
    );
    return data.allowed;
  } catch (err) {
    console.warn(
      "[guest-network-gate] unavailable, allowing the turn:",
      err instanceof Error ? err.message : err,
    );
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The caller's real address, read off the headers a proxy in front of this
 * app sets — this app never sees the raw socket itself, since Vercel (and
 * any reverse proxy) always sits in between.
 *
 * `x-forwarded-for` can carry a CHAIN of addresses when more than one proxy
 * touched the request (each hop appends its own, comma-separated) — the
 * FIRST one is the original client, which is the one this cares about.
 * `x-real-ip` is the fallback some platforms set instead.
 *
 * Returns null when neither header is present (plain local development,
 * or a platform that sets neither) — callers treat null as "nothing to
 * bucket by" and let the turn through, never as a reason to refuse one.
 */
export function guestIpFromRequest(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  return realIp?.trim() || null;
}
