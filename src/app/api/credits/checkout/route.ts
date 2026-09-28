import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";
import { MIN_TOPUP_NGN } from "@/lib/creditPacks";

// POST /api/credits/checkout — start a Paystack payment for a credit top-up.
//
// A thin BFF pass-through, deliberately: only the AMOUNT travels, and
// velte-backend derives the credits it buys from its OWN rate. Nothing about
// the credit count is decided here, because anything decided here is something
// a client could decide instead — the amount is a request the buyer makes, the
// credits are Velte's to compute.
export async function POST(req: Request) {
  // VENDOR wins when both cookies exist (2026-09-22, reversed — see
  // search/route.ts's own comment for the full reasoning).
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  const cookie = vendorAuth?.cookie ?? buyerAuth?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to top up credits." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    amountNgn?: unknown;
  } | null;
  const amountNgn = body?.amountNgn;
  // Shape check only — the floor and the ceiling are enforced again on the
  // server that actually charges. This exists so an obvious bad request gets
  // its own message instead of a round trip.
  if (
    typeof amountNgn !== "number" ||
    !Number.isInteger(amountNgn) ||
    amountNgn < MIN_TOPUP_NGN
  ) {
    return NextResponse.json(
      {
        error: `Enter an amount of at least ₦${MIN_TOPUP_NGN.toLocaleString("en-NG")}.`,
      },
      { status: 400 },
    );
  }

  try {
    const data = await backendData<{
      authorizationUrl: string;
      reference: string;
      amountKobo: number;
    }>("/credits/checkout", {
      method: "POST",
      body: { amountNgn },
      cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't start the payment.");
  }
}
