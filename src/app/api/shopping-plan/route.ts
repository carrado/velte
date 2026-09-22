import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingPlanSummary } from "@/types/shoppingPlan";

// GET /api/shopping-plan — the Shopping Plans index page's own data
// source. Every plan this buyer OR vendor has started, newest first, in
// the lighter summary shape (see velte-backend's toSummaryShape) — the
// detail page (/api/shopping-plan/:id) is what loads one plan's full
// items/candidate data. VENDOR wins when both cookies exist (2026-09-22,
// reversed — see search/route.ts's own comment for the full reasoning).
//
// Plan CREATION deliberately has no route here — it only ever happens
// server-side, inside /api/search/route.ts's own deadline branch, which
// already has a session to act under and calls velte-backend directly.
export async function GET() {
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to view your Shopping Plans.");
  }

  try {
    const { plans } = await backendData<{ plans: ShoppingPlanSummary[] }>(
      "/shopping-plans",
      { cookie: vendorAuth?.cookie ?? buyerAuth?.cookie ?? "" },
    );
    return NextResponse.json({ plans });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-plan] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your Shopping Plans." },
      { status: 502 },
    );
  }
}
