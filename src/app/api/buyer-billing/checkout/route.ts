import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";

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
  const buyerAuth = await getOptionalBuyerAuth();
  if (!buyerAuth) {
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
    // getOptionalBuyerAuth hands back just the buyer cookie, already
    // formatted — a vendor session never travels with a buyer's purchase.
    const data = await backendData<{
      authorizationUrl: string;
      reference: string;
      amountKobo: number;
    }>("/buyer-billing/checkout", {
      method: "POST",
      body: { planId: body.planId, cycle: body.cycle },
      cookie: buyerAuth.cookie,
    });

    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't start the upgrade. Please try again.");
  }
}
