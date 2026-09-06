import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/vendor/buyer-requests/:id
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const { request } = await backendData<{ request: BuyerRequest }>(
      `/vendor/buyer-requests/${id}`,
      { cookie: gate.cookie },
    );
    // No strip needed since 2026-09-03 — the backend stopped releasing the
    // buyer's number to vendors entirely (withoutBuyerPhone). It went through
    // two earlier stages: gated on Accept, then gated AND stripped here
    // because "gated" meant it still reached the DOM. Now it is simply never
    // sent, because a vendor has nothing to do with it: the buyer messages
    // them.
    return NextResponse.json({ request });
  } catch (err) {
    return fail(err, "Failed to load this request.");
  }
}
