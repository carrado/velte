import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { ShoppingPlan } from "@/types/search";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/shopping-plan/:id — one plan's full detail, for /chat/plans/:id.
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) return jsonError(401, "Sign in to view this plan.");

  const { id } = await params;
  try {
    const { plan } = await backendData<{ plan: ShoppingPlan }>(
      `/shopping-plan/${encodeURIComponent(id)}`,
      { cookie: auth.cookie },
    );
    return NextResponse.json({ plan });
  } catch (err) {
    return fail(err, "Couldn't load that plan.");
  }
}
