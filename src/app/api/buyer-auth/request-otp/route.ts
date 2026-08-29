import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendFetch } from "@/lib/server/backend";

// POST /api/buyer-auth/request-otp — public.
//
// The session cookie is forwarded when one exists (2026-08-27) because the
// backend behaves differently for the two callers: a signed-in buyer is
// ATTACHING a number to their account (the code is held against it), while an
// anonymous one is proving a number for a single request (the code lives in
// PhoneVerification and no account is created). Without forwarding, a
// signed-in buyer would silently take the anonymous path and never get their
// number retained.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const auth = await getOptionalBuyerAuth();
  try {
    await backendFetch("/buyer-auth/request-otp", {
      method: "POST",
      body,
      ...(auth ? { cookie: auth.cookie } : {}),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Couldn't send the verification code.");
  }
}
