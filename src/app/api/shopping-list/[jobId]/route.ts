import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingListJob } from "@/types/shoppingList";

// GET /api/shopping-list/:jobId — the results page's own data source (see
// src/app/chat/shopping-list/[jobId]/page.tsx). Buyer OR vendor owned
// (widened 2026-09-17 — see shopping-list/start's own header comment); the
// backend's own ownership check (buyerId/vendorId match) is what actually
// enforces this — a mismatched account sees the same 404 a nonexistent job
// would, never a 403 that confirms the job exists at all.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to view your shopping lists.");
  }

  const { jobId } = await params;
  try {
    const { job } = await backendData<{ job: ShoppingListJob }>(
      `/shopping-list-jobs/${encodeURIComponent(jobId)}`,
      { cookie: buyerAuth?.cookie ?? vendorAuth?.cookie ?? "" },
    );
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-list] load failed:", err);
    return NextResponse.json(
      { error: "Couldn't load that shopping list." },
      { status: 502 },
    );
  }
}
