import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingListJobSummary } from "@/types/shoppingList";

// GET /api/shopping-list — "My Shopping Lists" (spec §20). Every job this
// buyer OR vendor has started, newest first, in the lighter summary shape
// (see velte-backend's toSummaryShape) — the detail page
// (/api/shopping-list/:jobId) is what loads one job's full items/results.
// Widened 2026-09-17 from buyer-only — see shopping-list/start's own header
// comment for the product direction. Buyer wins when both cookies exist.
export async function GET() {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to view your shopping lists.");
  }

  try {
    const { jobs } = await backendData<{ jobs: ShoppingListJobSummary[] }>(
      "/shopping-list-jobs",
      { cookie: buyerAuth?.cookie ?? vendorAuth?.cookie ?? "" },
    );
    return NextResponse.json({ jobs });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-list] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your shopping lists." },
      { status: 502 },
    );
  }
}
