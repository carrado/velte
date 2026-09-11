import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import { resolvePlanItem } from "@/lib/server/ai/pickPlanItem";
import type { BuyerLocation, ShoppingPlan } from "@/types/search";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

// PATCH /api/shopping-plan/:id/items/:itemId — the v1 "Replace this item"
// edit. Re-runs the SAME resolvePlanItem pipeline the initial build used,
// excluding whatever is currently selected so a re-search can't just hand
// back the identical listing labeled "replaced" — then persists whatever it
// finds (including a genuine no_match, if nothing else verified survives).
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) return jsonError(401, "Sign in to edit this plan.");

  const { id, itemId } = await params;
  const body = (await req.json().catch(() => null)) as {
    label?: string;
    targetBudgetKobo?: number | null;
    excludeProductId?: string | null;
    excludeExternalOfferId?: string | null;
    location?: {
      area?: string | null;
      lat?: number | null;
      lng?: number | null;
    };
  } | null;

  if (!body || typeof body.label !== "string" || !body.label.trim()) {
    return jsonError(400, "The item's label is required to re-search it.");
  }

  const buyerLocation: BuyerLocation | undefined =
    body.location?.lat != null && body.location?.lng != null
      ? { lat: body.location.lat, lng: body.location.lng }
      : undefined;

  try {
    const result = await resolvePlanItem({
      label: body.label,
      targetBudgetKobo:
        typeof body.targetBudgetKobo === "number"
          ? body.targetBudgetKobo
          : null,
      buyerLocation,
      locationLabel: body.location?.area ?? undefined,
      excludeProductId: body.excludeProductId,
      excludeExternalOfferId: body.excludeExternalOfferId,
    });

    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plan/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`,
      {
        method: "PATCH",
        cookie: auth.cookie,
        body: {
          status: result.status,
          source: result.source,
          productId: result.productId,
          vendorId: result.vendorId,
          externalOfferId: result.externalOfferId,
          name: result.name,
          imageUrl: result.imageUrl,
          priceKobo: result.priceKobo,
          merchant: result.merchant,
          url: result.url,
        },
      },
    );

    return NextResponse.json({ plan });
  } catch (err) {
    return fail(err, "Couldn't replace that item.");
  }
}
