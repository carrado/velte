import { NextResponse } from "next/server";

import { fail } from "@/lib/server/guards";
import { requireBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

// GET /api/buyer-requests/my
export async function GET() {
  const gate = await requireBuyerAuth();
  if ("response" in gate) return gate.response;
  try {
    const { requests } = await backendData<{ requests: BuyerRequest[] }>(
      "/buyer-requests/my",
      { cookie: gate.cookie },
    );
    return NextResponse.json({ requests });
  } catch (err) {
    return fail(err, "Failed to load your requests.");
  }
}
