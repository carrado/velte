import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequest } from "@/types/buyerRequest";

// GET /api/vendor/buyer-requests — requests matched to the signed-in
// vendor. Uses the EXISTING vendor requireAuth, not the buyer guard.
export async function GET() {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  try {
    const { requests } = await backendData<{ requests: BuyerRequest[] }>(
      "/vendor/buyer-requests",
      { cookie: gate.cookie },
    );
    // Nothing to strip since 2026-09-03: the backend no longer sends a
    // buyer's number to a vendor at all, accepted or not, because vendors no
    // longer start the conversation. The buyer does, from their own requests
    // page. Passed straight through.
    return NextResponse.json({ requests });
  } catch (err) {
    return fail(err, "Failed to load buyer requests.");
  }
}
