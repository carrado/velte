import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingPlan } from "@/types/shoppingPlan";

// PATCH /api/shopping-plan/:id/items/:itemId/select — persists the buyer's
// own pick of a candidate onto an item (spec §17's "Selected" state). Body:
// { candidateId: string | null } (null clears the selection).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const buyerAuth = await getOptionalBuyerAuth();
  const vendorAuth = buyerAuth ? null : await getOptionalVendorAuth();
  if (!buyerAuth && !vendorAuth) {
    return jsonError(401, "Sign in to manage your Shopping Plan.");
  }

  const { id, itemId } = await params;
  const body = await req.json().catch(() => null);

  try {
    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plans/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}/select`,
      {
        method: "PATCH",
        body: { candidateId: body?.candidateId ?? null },
        cookie: buyerAuth?.cookie ?? vendorAuth?.cookie ?? "",
      },
    );
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-plan] select failed:", err);
    return NextResponse.json(
      { error: "Couldn't update your selection." },
      { status: 502 },
    );
  }
}
