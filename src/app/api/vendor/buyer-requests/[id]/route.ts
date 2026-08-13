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
    return NextResponse.json({ request });
  } catch (err) {
    return fail(err, "Failed to load this request.");
  }
}
