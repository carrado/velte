import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { ShoppingPlanSummary } from "@/types/search";

// GET /api/shopping-plan/mine — this buyer's plans, for /chat/plans (same
// shape as /api/buyer-requests/mine feeding RequestsPage.tsx). An anonymous
// caller gets an empty list rather than a 401, same reasoning as that
// route: the page renders its own sign-in prompt.
export async function GET() {
  const auth = await getOptionalBuyerAuth();
  if (!auth) {
    return NextResponse.json({ plans: [] });
  }

  try {
    const { plans } = await backendData<{ plans: ShoppingPlanSummary[] }>(
      "/shopping-plan/mine",
      { cookie: auth.cookie },
    );
    return NextResponse.json({ plans });
  } catch (err) {
    return fail(err, "Couldn't load your shopping plans.");
  }
}
