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
    // The number never goes to the browser (2026-08-27). The backend already
    // gates it on this vendor having accepted, but "gated" stopped meaning
    // "not rendered" and started meaning "not sent": in the DOM it was
    // readable from the status bar on hover, from copy-link-address, and
    // straight out of this payload. Chatting goes through
    // /api/vendor/buyer-requests/:id/chat, which resolves it server-side.
    //
    // `canChat` replaces it — the one bit the UI actually needs.
    const { buyerPhone, ...safe } = request;
    return NextResponse.json({
      request: { ...safe, canChat: Boolean(buyerPhone) },
    });
  } catch (err) {
    return fail(err, "Failed to load this request.");
  }
}
