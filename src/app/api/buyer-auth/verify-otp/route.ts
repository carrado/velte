import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import type { Buyer } from "@/types/buyer";

// POST /api/buyer-auth/verify-otp — public.
//
// No longer sets a session cookie (2026-08-27). Verifying a phone stopped
// being a way to get an account: `buyer_auth_token` now means "signed in with
// Google" and is issued only by /api/buyer-auth/firebase. What this returns
// depends on who asked:
//
//   anonymous → { phoneToken } — a short-lived proof of ONE number, held in
//               memory by the caller and passed to POST /api/buyer-requests.
//               Nothing is stored about them, and no Buyer is created.
//   signed in → { buyer } — the number is now attached to their account, so
//               the next reach-out can offer it back instead of asking again.
//
// The session cookie is forwarded so the backend can tell the two apart; it
// is never modified here.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const auth = await getOptionalBuyerAuth();
  try {
    const data = await backendData<{
      buyer?: Buyer;
      phoneToken?: string;
    }>("/buyer-auth/verify-otp", {
      method: "POST",
      body,
      ...(auth ? { cookie: auth.cookie } : {}),
    });
    return NextResponse.json({
      buyer: data.buyer ?? null,
      phoneToken: data.phoneToken ?? null,
    });
  } catch (err) {
    return fail(err, "Verification failed.");
  }
}
