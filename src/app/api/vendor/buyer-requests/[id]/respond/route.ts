import { NextResponse } from "next/server";

import { requireAuth, fail, jsonError } from "@/lib/server/guards";
import { backendData } from "@/lib/server/backend";
import type { BuyerRequestResponseItem } from "@/types/buyerRequest";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/vendor/buyer-requests/:id/respond — writes the vendor's text
// response only. Deliberately does NOT charge anything (see
// docs/velte_buyer_requests_mvp_spec.md §62.1) — billing happens later, on
// the buyer's own "Chat on WhatsApp" click via the existing
// POST /api/search/lead.
export async function POST(req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body?.vendorResponse) {
    return jsonError(400, "A response message is required.");
  }

  try {
    const { response } = await backendData<{
      response: BuyerRequestResponseItem;
    }>(`/vendor/buyer-requests/${id}/respond`, {
      method: "POST",
      body,
      cookie: gate.cookie,
    });
    return NextResponse.json({ response }, { status: 201 });
  } catch (err) {
    return fail(err, "Failed to send your response.");
  }
}
