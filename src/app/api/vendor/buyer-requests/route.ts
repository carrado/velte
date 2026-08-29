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
    // Same strip as the detail route (2026-08-27): the backend already gates
    // buyerPhone on this vendor having accepted, but it never reaches the
    // browser either way. `canChat` is the one bit the list needs, and
    // chatting goes through /api/vendor/buyer-requests/:id/chat.
    return NextResponse.json({
      requests: requests.map(({ buyerPhone, ...rest }) => ({
        ...rest,
        canChat: Boolean(buyerPhone),
      })),
    });
  } catch (err) {
    return fail(err, "Failed to load buyer requests.");
  }
}
