import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/buyer-requests/:id
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const { request } = await backendData<{ request: BuyerRequest }>(
      `/buyer-requests/${id}`,
      { cookie: gate.cookie },
    );
    return NextResponse.json({ request });
  } catch (err) {
    return fail(err, "Failed to load this request.");
  }
}
