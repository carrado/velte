import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingListJobSummary } from "@/types/shoppingList";

// GET /api/shopping-list — "My Shopping Lists" (spec §20). Every job this
// buyer has started, newest first, in the lighter summary shape (see
// velte-backend's toSummaryShape) — the detail page (/api/shopping-list/:jobId)
// is what loads one job's full items/results.
export async function GET() {
  const auth = await requireBuyerAuth();
  if ("response" in auth) return auth.response;

  try {
    const { jobs } = await backendData<{ jobs: ShoppingListJobSummary[] }>(
      "/shopping-list-jobs",
      { cookie: auth.cookie },
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
