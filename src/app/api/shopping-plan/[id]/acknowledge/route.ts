import { NextResponse } from "next/server";

import { fail, jsonError } from "@/lib/server/guards";
import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/shopping-plan/:id/acknowledge — the buyer has SEEN this plan's
// completion toast (2026-09-10).
//
// Persisted server-side rather than remembered in the browser, because the
// thing it has to survive is exactly a refresh: a module-level "already
// toasted" Set is gone the moment the page reloads, so without this the
// "your plan is ready 🎉" toast re-fires on every single page load forever.
//
// Ownership is the backend's (buyerId on the query) — a plan id from the
// client is never trusted on its own.
export async function POST(_req: Request, { params }: Ctx) {
  const auth = await getOptionalBuyerAuth();
  if (!auth) return jsonError(401, "Sign in to update this plan.");

  const { id } = await params;
  try {
    const data = await backendData<{ acknowledgedAt: string | null }>(
      `/shopping-plan/${encodeURIComponent(id)}/acknowledge`,
      { method: "POST", cookie: auth.cookie },
    );
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Couldn't update that plan.");
  }
}
