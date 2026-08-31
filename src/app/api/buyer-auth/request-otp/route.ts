import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/buyer-auth/request-otp — signed in only (2026-08-29).
//
// The backend used to serve two callers here: a signed-in buyer ATTACHING a
// number to their account, and an anonymous one proving a number for a single
// Buyer Request. The anonymous half is gone — posting a request requires a
// real account now, so there is nobody left to prove a number for — and with
// it goes the last way to spend an SMS without an account.
//
// Refused here as well as upstream so the browser doesn't pay a round trip
// for a state it already knows it is in.
export async function POST(req: Request) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) {
    return jsonError(401, "Sign in before verifying a number.");
  }
  const body = await req.json().catch(() => ({}));
  try {
    await backendFetch("/buyer-auth/request-otp", {
      method: "POST",
      body,
      cookie: auth.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Couldn't send the verification code.");
  }
}
