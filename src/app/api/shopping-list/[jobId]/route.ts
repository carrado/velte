import { NextResponse } from "next/server";

import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData, BackendError } from "@/lib/server/backend";
import type { ShoppingListJob } from "@/types/shoppingList";

// GET /api/shopping-list/:jobId — the results page's own data source (see
// src/app/chat/shopping-list/[jobId]/page.tsx). Buyer-owned only; the
// backend's own ownership check (buyerId match) is what actually enforces
// this — a mismatched buyer sees the same 404 a nonexistent job would,
// never a 403 that confirms the job exists at all.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireBuyerAuth();
  if ("response" in auth) return auth.response;

  const { jobId } = await params;
  try {
    const { job } = await backendData<{ job: ShoppingListJob }>(
      `/shopping-list-jobs/${encodeURIComponent(jobId)}`,
      { cookie: auth.cookie },
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
