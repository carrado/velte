import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { jsonError } from "./guards";
import { BUYER_AUTH_COOKIE, verifyBuyerSession } from "./buyerSession";

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
