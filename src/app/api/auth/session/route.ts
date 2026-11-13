import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BackendError, backendData } from "@/lib/server/backend";
import { clearSessionCookies } from "@/lib/server/clearSessionCookies";
import { AUTH_COOKIE } from "@/lib/server/session";
import { BUYER_AUTH_COOKIE } from "@/lib/server/buyerSession";
import { fail, jsonError } from "@/lib/server/guards";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";

// GET /api/auth/session — The unified auth & session API.
//
// Replaces the old split between /api/auth/session (lenient) and /api/auth/me (strict):
// - Default (lenient): Returns `{ vendor, buyer, user: vendor, vendorError }` with 200 OK.
//   Guests with no cookies resolve immediately without touching the network.
//   Ambient consumers (navbars, sessionSync, pricing) use this mode safely.
// - Strict vendor mode (`?strict=vendor`):
//   If there is no vendor cookie, throws 401 Unauthorized.
//   If the vendor is unverified, throws 403 Forbidden with `{ email }`.
//   Protected vendor services (`usersApi.getMe()`, `settingsApi.fetchProfile()`) use this.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const strictVendor =
    searchParams.get("strict") === "vendor" ||
    searchParams.get("strict") === "true";

  const jar = await cookies();
  const vendorToken = jar.get(AUTH_COOKIE)?.value;
  const buyerToken = jar.get(BUYER_AUTH_COOKIE)?.value;

  // In strict vendor mode, missing vendorToken is an immediate 401
  if (strictVendor && !vendorToken) {
    return jsonError(401, "Sign in to access this resource.");
  }

  // Nothing to ask the backend when neither cookie exists at all — a plain
  // guest shouldn't block on a network round trip to learn what its own
  // empty cookie jar already told this route for free.
  if (!vendorToken && !buyerToken) {
    return NextResponse.json({
      user: null,
      vendor: null,
      buyer: null,
      vendorError: null,
    });
  }

  const parts: string[] = [];
  if (vendorToken) parts.push(`${AUTH_COOKIE}=${vendorToken}`);
  if (buyerToken) parts.push(`${BUYER_AUTH_COOKIE}=${buyerToken}`);

  try {
    const data = await backendData<{
      vendor: (User & { _id?: string }) | null;
      buyer: (Buyer & { _id?: string }) | null;
      vendorError: {
        status?: number;
        message?: string;
        email?: string;
      } | null;
    }>("/auth/me", { cookie: parts.join("; ") });

    // Normalise `id ?? _id` — the frontend User/Buyer types depend on `id`
    const vendor = data.vendor
      ? { ...data.vendor, id: data.vendor.id ?? data.vendor._id }
      : null;
    const buyer = data.buyer
      ? { ...data.buyer, id: data.buyer.id ?? data.buyer._id }
      : null;

    // Strict vendor mode: enforce vendor validity and email verification
    if (strictVendor) {
      if (data.vendorError) {
        const status = data.vendorError.status ?? 403;
        const msg = data.vendorError.message ?? "Forbidden";
        return NextResponse.json(
          data.vendorError.email
            ? {
                error: msg,
                email: data.vendorError.email,
                fields: { email: data.vendorError.email },
              }
            : { error: msg },
          { status },
        );
      }
      if (!vendor) {
        return jsonError(401, "Sign in to access this resource.");
      }
      return NextResponse.json({
        user: vendor,
        vendor,
        buyer,
        vendorError: null,
      });
    }

    // Lenient mode: unverified vendors still hold a real cookie (403). Anything else
    // that was sent and came back empty did not survive verification.
    const vendorUnverified = data.vendorError?.status === 403;
    const dead: string[] = [];
    if (vendorToken && !vendor && !vendorUnverified) dead.push(AUTH_COOKIE);
    if (buyerToken && !buyer) dead.push(BUYER_AUTH_COOKIE);
    if (dead.length > 0 && !vendor && !buyer && !vendorUnverified) {
      return clearSessionCookies(
        NextResponse.json(
          {
            user: null,
            vendor: null,
            buyer: null,
            vendorError: data.vendorError ?? null,
            code: "session_expired",
          },
          { status: 401 },
        ),
        dead,
      );
    }

    return clearSessionCookies(
      NextResponse.json({
        user: vendor,
        vendor,
        buyer,
        vendorError: data.vendorError ?? null,
      }),
      dead,
    );
  } catch (err) {
    if (strictVendor) {
      return fail(err, "Failed to load profile.");
    }

    // A real "you are not signed in" from the backend (an expired or
    // revoked token) IS an answer — signed out, nothing to retry.
    if (
      err instanceof BackendError &&
      (err.status === 401 || err.status === 403)
    ) {
      return NextResponse.json({
        user: null,
        vendor: null,
        buyer: null,
        vendorError: null,
      });
    }

    // Anything else: a 503, NOT `{ vendor: null, buyer: null }`.
    return NextResponse.json(
      { error: "Couldn't check the session right now." },
      { status: 503 },
    );
  }
}
