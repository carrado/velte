import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { jsonError } from "./guards";
import { BUYER_AUTH_COOKIE, verifyBuyerSession } from "./buyerSession";
import { AUTH_COOKIE, verifySession } from "./session";

/* Buyer-side counterpart to guards.ts's requireAuth — identical pattern,
   reads the separate buyer_auth_token cookie. Reuses jsonError/fail/
   applySetCookies from guards.ts directly (those are already
   actor-agnostic); only cookie/session resolution differs, so that's all
   this file adds. */

export const unauthorizedBuyer = () => jsonError(401, "Not authenticated.");

export async function requireBuyerAuth(): Promise<
  { buyerId: string; cookie: string } | { response: NextResponse }
> {
  const token = (await cookies()).get(BUYER_AUTH_COOKIE)?.value;
  if (!token) return { response: unauthorizedBuyer() };

  const session = await verifyBuyerSession(token);
  if (!session) return { response: unauthorizedBuyer() };

  return {
    buyerId: session.buyerId,
    cookie: `${BUYER_AUTH_COOKIE}=${token}`,
  };
}

/** Like getOptionalUserId, for pages that render fine for a logged-out
 * visitor and only need to know IF a buyer happens to be signed in. */
export async function getOptionalBuyerId(): Promise<string | null> {
  const token = (await cookies()).get(BUYER_AUTH_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyBuyerSession(token);
  return session?.buyerId ?? null;
}

/** Like getOptionalBuyerId, but also hands back the cookie string a caller
 * needs to forward to the backend (see requireBuyerAuth) — for a route that
 * has to KEEP WORKING for an anonymous buyer (never 401s) but still wants
 * to act on their behalf when a session happens to exist. /api/search's
 * createBuyerRequest tool is the first user of this: it can't gate the
 * whole search endpoint behind buyer auth (search itself stays anonymous),
 * but needs the cookie to actually create a request when one is already
 * signed in. */
export async function getOptionalBuyerAuth(): Promise<{
  buyerId: string;
  cookie: string;
} | null> {
  const token = (await cookies()).get(BUYER_AUTH_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyBuyerSession(token);
  if (!session) return null;
  return { buyerId: session.buyerId, cookie: `${BUYER_AUTH_COOKIE}=${token}` };
}

/** Either session, for the Buyer Request routes (2026-09-27).
 *
 * A VENDOR posts and reads its own requests now, not just a buyer — they buy
 * things other than what they sell, and /chat is where they do it. Was
 * buyer-only, which is why a vendor signed into /chat was told to "sign in
 * first" while already being signed in.
 *
 * Hands the BACKEND both sessions rather than deciding here which one the
 * caller is: ownership (Buyer vs User, and the `Buyer.linkedVendorId` case
 * where a vendor who signed in with Google resolves as themselves) is
 * resolveActor's call in velte-backend, and a second copy of that rule on
 * this side would drift from it. `type`/`id` here are for this side's own
 * branching only.
 *
 * Null when NEITHER session is valid, which the caller answers with its own
 * 401 — same shape as getOptionalBuyerAuth, and for the same reason: an
 * invalid token must not read as a real caller. */
export async function getActorAuth(): Promise<{
  type: "buyer" | "vendor";
  id: string;
  cookie: string;
} | null> {
  const jar = await cookies();

  const buyerToken = jar.get(BUYER_AUTH_COOKIE)?.value;
  const buyerSession = buyerToken ? await verifyBuyerSession(buyerToken) : null;

  const vendorToken = jar.get(AUTH_COOKIE)?.value;
  const vendorSession = vendorToken ? await verifySession(vendorToken) : null;

  if (!buyerSession && !vendorSession) return null;

  const parts: string[] = [];
  if (buyerSession && buyerToken) {
    parts.push(`${BUYER_AUTH_COOKIE}=${buyerToken}`);
  }
  if (vendorSession && vendorToken) {
    parts.push(`${AUTH_COOKIE}=${vendorToken}`);
  }

  return buyerSession
    ? { type: "buyer", id: buyerSession.buyerId, cookie: parts.join("; ") }
    : { type: "vendor", id: vendorSession!.userId, cookie: parts.join("; ") };
}
