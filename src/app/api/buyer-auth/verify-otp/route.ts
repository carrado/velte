import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import type { Buyer } from "@/types/buyer";

// POST /api/buyer-auth/verify-otp — signed in only (2026-08-29).
//
// It has never set a session cookie, and since 2026-08-27 verifying a phone
// stopped being a way to get an account at all: `buyer_auth_token` means
// "signed in with Google" and is issued only by /api/buyer-auth/firebase.
//
// What changed now is the other half. This used to answer an ANONYMOUS
// caller with a `phoneToken` — a short-lived proof of one number, passed to
// POST /api/buyer-requests by someone with no account. Requests require a
// real account, so that token authorises nothing and the branch is gone from
// the backend too. One outcome remains: { buyer }, with the number attached
// to their account, so the next reach-out offers it back instead of asking
// again.
export async function POST(req: Request) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) {
    return jsonError(401, "Sign in before verifying a number.");
  }
  const body = await req.json().catch(() => ({}));
  try {
    const data = await backendData<{ buyer?: Buyer }>(
      "/buyer-auth/verify-otp",
      { method: "POST", body, cookie: auth.cookie },
    );
    return NextResponse.json({ buyer: data.buyer ?? null });
  } catch (err) {
    return fail(err, "Verification failed.");
  }
}
