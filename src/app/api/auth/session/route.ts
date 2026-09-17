import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
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
// 200s with `{ vendor, buyer, vendorError }`; this route just never looks
// at `vendorError`, since a broken vendor cookie is simply "no vendor" for
// a lenient caller, not something worth failing over). Trustworthy doing
// so precisely BECAUSE loginAsVendor and firebaseSignIn now pair or clear
// the other cookie at login time (see identityLink.service.js in that
// repo) — the two cookies in a real request are guaranteed to already
// agree. Never 401s — a guest (`{vendor: null, buyer: null}`) is a normal
// answer, not an error, so this never uses requireAuth()/requireBuyerAuth().
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
      vendorError: unknown;
    }>("/auth/me", { cookie: parts.join("; ") });
    return NextResponse.json({
      // Same `id ?? _id` normalisation /api/auth/me already needs — see
      // that route's own comment: the frontend User/Buyer types depend on
      // `id`, and a raw Mongoose doc doesn't always carry it.
      vendor: data.vendor
        ? { ...data.vendor, id: data.vendor.id ?? data.vendor._id }
        : null,
      buyer: data.buyer
        ? { ...data.buyer, id: data.buyer.id ?? data.buyer._id }
        : null,
    });
  } catch {
    // Best-effort, same as the silent identity syncs this replaces
    // (getMeSilent/useBuyerSession's own queryFn) — a failed background
    // identity check must never surface as an error to a buyer just
    // browsing /chat; it just leaves both stores empty, same as a guest.
    return NextResponse.json({ vendor: null, buyer: null });
  }
}
