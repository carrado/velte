import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import {
  affordCredits,
  chargeCredits,
  creditMessage,
} from "@/lib/server/creditLedger";

// GET  /api/price-watch — this buyer's watches.
// POST /api/price-watch — start watching something.
//
// Thin BFF over velte-backend. It used to send a per-tier watch ALLOWANCE for
// the backend to enforce; since 2026-08-31 there are no tiers — a watch simply
// costs credits, and how many a buyer can run is however many they choose to
// pay for. That removes a concurrency cap that was always a slightly odd
// shape: a watch is cheap to serve, so rationing it by count never reflected
// anything real.

/** Whichever session this request carries. Buyer wins when both exist — on
 *  /chat they are acting as a buyer. */
async function currentSession(): Promise<{
  cookie: string;
  actorType: "buyer" | "vendor";
} | null> {
  const buyer = await getOptionalBuyerAuth();
  if (buyer) return { cookie: buyer.cookie, actorType: "buyer" };
  const vendor = await getOptionalVendorAuth();
  return vendor ? { cookie: vendor.cookie, actorType: "vendor" } : null;
}

export async function GET() {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ watches: [] });
  }
  try {
    const data = await backendData<{ watches: unknown[] }>("/price-watch", {
      cookie: session.cookie,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't load your watches.");
  }
}

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to watch a price." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // CHECKED before the watch is created, CHARGED once it exists. Nothing is
  // taken up front — a buyer must not pay for a watch that failed to start —
  // but the check still happens first, or an empty balance could create one
  // and never pay for it.
  //
  // A watch is cheap to serve (page fetches, no LLM) but long-lived and
  // genuinely valuable, so it is priced on what an alert is worth rather than
  // on what it costs, exactly as the negotiation brief is.
  const affordable = await affordCredits({
    actorType: session.actorType,
    cookie: session.cookie,
    action: "watch",
  });
  if (!affordable.allowed) {
    return NextResponse.json(
      {
        error: creditMessage(affordable),
        code: "credits_required",
        balance: affordable.balance,
        cost: affordable.cost,
      },
      { status: 402 },
    );
  }

  try {
    const data = await backendData<{ watch: unknown }>("/price-watch", {
      method: "POST",
      body,
      cookie: session.cookie,
    });
    // The watch exists — now it is billable. Not awaited into the response:
    // a charge that failed costs Velte five credits' revenue, where a charge
    // that could fail the request would cost the buyer a watch they just
    // successfully created.
    void chargeCredits({
      actorType: session.actorType,
      cookie: session.cookie,
      action: "watch",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return fail(err, "Couldn't start watching that price.");
  }
}
