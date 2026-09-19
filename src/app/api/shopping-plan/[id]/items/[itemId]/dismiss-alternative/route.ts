import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingPlan } from "@/types/shoppingPlan";

// PATCH /api/shopping-plan/:id/items/:itemId/dismiss-alternative — the
// buyer declining a suggested replacement (spec §20's approval
// requirement, the "no" half alongside select's "yes").
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to manage your Shopping Plan.");
  }

  const { id, itemId } = await params;

  try {
    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plans/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}/dismiss-alternative`,
      {
        method: "PATCH",
        cookie: buyerAuth?.cookie ?? vendorAuth?.cookie ?? "",
      },
    );
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-plan] dismiss-alternative failed:", err);
    return NextResponse.json(
      { error: "Couldn't dismiss that suggestion." },
      { status: 502 },
    );
  }
}
