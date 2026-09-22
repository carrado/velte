import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// POST /api/credits/verify-topup — confirm a card top-up directly with
// Paystack instead of only waiting on the `charge.success` webhook
// (2026-09-16). Card top-ups on local dev never receive a webhook at all (no
// public callback URL for Paystack to call), and even in production a slow
// or dropped webhook left a buyer who had genuinely paid staring at a stale
// balance once SearchHome's own poll window (see its topUpResumeStartedRef
// effect) ran out with nothing left to retry.
//
// A thin pass-through, same shape as /api/credits/checkout: the reference is
// all that travels, and velte-backend re-verifies it against Paystack and the
// caller's OWN session before crediting anything — nothing here decides an
// amount or an owner.
//
// Same actor priority as /api/credits/checkout (vendor cookie wins when both
// exist, 2026-09-22, reversed — see search/route.ts's own comment) —
// whichever cookie is forwarded only has to reach the account, since
// the backend checks the reference's own metadata against req.actor and 403s
// a mismatch regardless of which cookie got it there.
export async function POST(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  const cookie = vendorAuth?.cookie ?? buyerAuth?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to verify a top-up." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    reference?: string;
  } | null;
  if (!body?.reference) {
    return NextResponse.json(
      { error: "reference is required." },
      { status: 400 },
    );
  }

  try {
    const data = await backendData<{
      balance: number;
      spentSinceTopUp: number;
      walletBalanceKobo: number | null;
    }>("/credits/verify-topup", {
      method: "POST",
      body: { reference: body.reference },
      cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't verify that payment.");
  }
}
