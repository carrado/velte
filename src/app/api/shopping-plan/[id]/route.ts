import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingPlan } from "@/types/shoppingPlan";

// GET /api/shopping-plan/:id — the detail page's own data source. Buyer OR
// vendor owned; the backend's own ownership check (buyerId/vendorId match)
// is what actually enforces this — a mismatched account sees the same 404
// a nonexistent plan would, never a 403 that confirms the plan exists.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // VENDOR wins when both cookies exist — see search/route.ts's own comment
  // (2026-09-22) on why this is safe unconditionally, no separate link
  // check needed here.
  const vendorAuth = await getOptionalVendorAuth();
  const buyerAuth = vendorAuth ? null : await getOptionalBuyerAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to view your Shopping Plans.");
  }

  const { id } = await params;
  try {
    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plans/${encodeURIComponent(id)}`,
      { cookie: vendorAuth?.cookie ?? buyerAuth?.cookie ?? "" },
    );
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-plan] load failed:", err);
    return NextResponse.json(
      { error: "Couldn't load that Shopping Plan." },
      { status: 502 },
    );
  }
}
