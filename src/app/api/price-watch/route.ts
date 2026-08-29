import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth } from "@/lib/server/guards";
import { PLANS, VENDOR_PRICE_WATCHES } from "@/lib/server/ai/plans";

// GET  /api/price-watch — this buyer's watches.
// POST /api/price-watch — start watching something.
//
// Thin BFF over velte-backend, with one addition: the POST sends the watch
// ALLOWANCE for every account tier, the same shape and same reasoning as the
// search quota (see lib/server/usage.ts). The numbers live in plans.ts;
// the backend picks the row matching its own buyer's plan.

/** Every account tier's price-watch allowance, plus the vendor row —
 *  `{ free: 0, plus: 20, business: 100, vendor: 10 }`. */
function watchLimits(): Record<string, number> {
  const table: Record<string, number> = {};
  for (const plan of Object.values(PLANS)) {
    if (!plan.requiresAccount) continue;
    table[plan.id] = plan.priceWatches;
  }
  // Not a tier — the row the backend uses for a vendor. See
  // VENDOR_PRICE_WATCHES for why it isn't just VENDOR_PLAN's allowance.
  table.vendor = VENDOR_PRICE_WATCHES;
  return table;
}

/** Whichever session this request carries. Buyer wins when both exist — on
 *  /chat they are acting as a buyer, and only a buyer account has a plan. */
async function currentSession(): Promise<{ cookie: string } | null> {
  const buyer = await getOptionalBuyerAuth();
  if (buyer) return { cookie: buyer.cookie };
  const vendor = await getOptionalVendorAuth();
  return vendor ? { cookie: vendor.cookie } : null;
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

  try {
    const data = await backendData<{ watch: unknown }>("/price-watch", {
      method: "POST",
      body: { ...body, limits: watchLimits() },
      cookie: session.cookie,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    // A 402 from upstream is the plan gate, not a failure — `fail` maps the
    // status through, and the client reads it to decide between an upgrade
    // prompt and an error.
    return fail(err, "Couldn't start watching that.");
  }
}
