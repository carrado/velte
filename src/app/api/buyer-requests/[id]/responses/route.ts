import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequestResponseItem } from "@/types/buyerRequest";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/buyer-requests/:id/responses
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const { responses } = await backendData<{
      responses: BuyerRequestResponseItem[];
    }>(`/buyer-requests/${id}/responses`, { cookie: gate.cookie });
    return NextResponse.json({ responses });
  } catch (err) {
    return fail(err, "Failed to load responses.");
  }
}
