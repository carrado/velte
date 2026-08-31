import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// POST /api/credits/checkout — start a Paystack payment for a credit pack.
//
// A thin BFF pass-through, deliberately: the pack id is all that travels, and
// velte-backend resolves the price and the credit count from its OWN table.
// Nothing about the amount is decided here, because anything decided here is
// something a client could decide instead.
export async function POST(req: Request) {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  const cookie = buyerAuth?.cookie ?? vendorAuth?.cookie;
  if (!cookie) {
    return NextResponse.json(
      { error: "Sign in to top up credits." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    packId?: string;
  } | null;
  if (!body?.packId) {
    return NextResponse.json({ error: "Pick a credit pack." }, { status: 400 });
  }

  try {
    const data = await backendData<{
      authorizationUrl: string;
      reference: string;
      amountKobo: number;
    }>("/credits/checkout", {
      method: "POST",
      body: { packId: body.packId },
      cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't start the payment.");
  }
}
