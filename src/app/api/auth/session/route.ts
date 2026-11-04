import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BackendError, backendData } from "@/lib/server/backend";
import { clearSessionCookies } from "@/lib/server/clearSessionCookies";
import { AUTH_COOKIE } from "@/lib/server/session";
import { BUYER_AUTH_COOKIE } from "@/lib/server/buyerSession";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

// GET /api/auth/session — "the single auth API" (2026-09-16, renamed from
// /api/auth/whoami 2026-09-17). Replaces the two independent, racing calls
// VendorSessionSync (getMeSilent) and useBuyerSession used to fire
// separately: one round trip that answers vendor, buyer, both, or neither.
//
// Backed by velte-backend's own GET /auth/me — the SAME endpoint
// src/app/api/auth/me/route.ts calls for its own strict, vendor-required
// use, reused here rather than a separate backend route (that one always
// 200s with `{ vendor, buyer, vendorError }`). `vendorError` 403 is an
// unverified vendor and is left alone; every other empty resolution of a
// cookie that was actually sent is a dead session. Trustworthy doing so
// precisely BECAUSE loginAsVendor and firebaseSignIn now pair or clear
// the other cookie at login time (see identityLink.service.js in that
// repo) — the two cookies in a real request are guaranteed to already
// agree. A guest (no cookies) is `{vendor: null, buyer: null}` with 200.
// A cookie that was sent and resolved to nobody is a dead session: 401,
// and the cookies are cleared, so the client can leave for home instead of
// treating it as the same answer as a guest.
export async function GET() {
  const jar = await cookies();
  const vendorToken = jar.get(AUTH_COOKIE)?.value;
  const buyerToken = jar.get(BUYER_AUTH_COOKIE)?.value;

  // Nothing to ask the backend when neither cookie exists at all — a plain
  // guest shouldn't block on a network round trip to learn what its own
  // empty cookie jar already told this route for free.
  if (!vendorToken && !buyerToken) {
    return NextResponse.json({ vendor: null, buyer: null });
  }

  const parts: string[] = [];
  if (vendorToken) parts.push(`${AUTH_COOKIE}=${vendorToken}`);
  if (buyerToken) parts.push(`${BUYER_AUTH_COOKIE}=${buyerToken}`);

  try {
    const data = await backendData<{
      vendor: (User & { _id?: string }) | null;
      buyer: (Buyer & { _id?: string }) | null;
      vendorError: { status?: number } | null;
    }>("/auth/me", { cookie: parts.join("; ") });
    // Same `id ?? _id` normalisation /api/auth/me already needs — see
    // that route's own comment: the frontend User/Buyer types depend on
    // `id`, and a raw Mongoose doc doesn't always carry it.
    const vendor = data.vendor
      ? { ...data.vendor, id: data.vendor.id ?? data.vendor._id }
      : null;
    const buyer = data.buyer
      ? { ...data.buyer, id: data.buyer.id ?? data.buyer._id }
      : null;
    // Unverified vendors still hold a real cookie (403). Anything else that
    // was sent and came back empty did not survive verification.
    const vendorUnverified = data.vendorError?.status === 403;
    const dead: string[] = [];
    if (vendorToken && !vendor && !vendorUnverified) dead.push(AUTH_COOKIE);
    if (buyerToken && !buyer) dead.push(BUYER_AUTH_COOKIE);
    if (dead.length > 0 && !vendor && !buyer && !vendorUnverified) {
      return clearSessionCookies(
        NextResponse.json(
          { vendor: null, buyer: null, code: "session_expired" },
          { status: 401 },
        ),
        dead,
      );
    }
    return clearSessionCookies(NextResponse.json({ vendor, buyer }), dead);
  } catch (err) {
    // A real "you are not signed in" from the backend (an expired or
    // revoked token) IS an answer — signed out, nothing to retry.
    if (
      err instanceof BackendError &&
      (err.status === 401 || err.status === 403)
    ) {
      return NextResponse.json({ vendor: null, buyer: null });
    }
    // Anything else: a 503, NOT `{ vendor: null, buyer: null }` (2026-09-25). Found live:
    // after a dropped connection (or the backend waking from a cold start),
    // this answered "nobody is signed in" for someone whose cookies were
    // perfectly valid, and /chat showed them as logged out until a manual
    // refresh. "Couldn't check" and "checked: signed out" are different
    // answers — IdentitySessionSync retries the first and trusts the second.
    // Still never shown to the buyer as an error; callers treat it silently.
    return NextResponse.json(
      { error: "Couldn't check the session right now." },
      { status: 503 },
    );
  }
}
