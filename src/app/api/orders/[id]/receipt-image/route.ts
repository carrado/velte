import { NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { getOrderReceiptImage } from "@/lib/server/orders";

// GET /api/orders/:id/receipt-image — the buyer's uploaded receipt (proxied from
// staffly) as a data URL, for the vendor to review before confirming.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    const image = await getOrderReceiptImage(id, gate.cookie);
    return NextResponse.json({ image });
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to load receipt image.");
  }
}
