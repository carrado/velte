import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";

// POST /api/buyer-billing/checkout — starts a plan purchase.
//
// A thin pass-through by design. It forwards the plan the buyer chose and
// their session, and returns the Paystack URL to send them to; the PRICE is
// never mentioned on this side of the wire. velte-backend's own
// config/buyerPlans.js decides what a plan costs, so a bug or a tampered
// request here can pick the wrong plan but can never pick the wrong price.
//
// Full-page redirect, not a popup — same call the pay page already made for
// the same reason: popups are unreliable for buyers arriving from WhatsApp
// on mobile, which is most of them.
export async function POST(req: Request) {
  // Either session may buy a plan (2026-08-29). Buyer wins when both cookies
  // are present — on /chat they are acting as a buyer, and that is the
  // account their history and saved items already hang off. A vendor with no
  // buyer session buys against their vendor identity instead of being sent
  // away to open a second account.
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  const cookie = buyerAuth?.cookie ?? vendorAuth?.cookie;
  if (!cookie) {
    return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    planId?: string;
    cycle?: string;
  } | null;

  if (!body?.planId || !body?.cycle) {
    return NextResponse.json(
      { error: "planId and cycle are required." },
      { status: 400 },
    );
  }

  try {
    // One cookie, already formatted, and only ever the one the actor was
    // resolved from — a buyer's purchase never travels with a vendor session
    // attached, or the backend's own resolveActor would pick the wrong one.
    const data = await backendData<{
      authorizationUrl: string;
      reference: string;
      amountKobo: number;
    }>("/buyer-billing/checkout", {
      method: "POST",
      body: { planId: body.planId, cycle: body.cycle },
      cookie,
    });

    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't start the upgrade. Please try again.");
  }
}
