import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalVendorAuth, jsonError } from "@/lib/server/guards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingPlan } from "@/types/shoppingPlan";

// PATCH /api/shopping-plan/:id/items/:itemId/purchase — marks (or unmarks)
// a SPECIFIC candidate as actually bought (spec §28). Per-candidate, not
// per-item, since 2026-09-20 (there's no more standing "selected"
// candidate to purchase — see types/shoppingPlan.ts's own comment on
// ShoppingPlanCandidate.purchased). Body: { candidateId: string, purchased:
// boolean }.
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
  if (!body?.candidateId || typeof body.candidateId !== "string") {
    return jsonError(400, "candidateId is required.");
  }

  try {
    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plans/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}/purchase`,
      {
        method: "PATCH",
        body: {
          candidateId: body.candidateId,
          purchased: body?.purchased === true,
        },
        cookie: buyerAuth?.cookie ?? vendorAuth?.cookie ?? "",
      },
    );
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[shopping-plan] purchase failed:", err);
    return NextResponse.json(
      { error: "Couldn't update that item." },
      { status: 502 },
    );
  }
}
