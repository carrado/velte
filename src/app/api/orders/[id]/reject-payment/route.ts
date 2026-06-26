import { NextResponse } from "next/server";

import { requireAuth, jsonError } from "@/lib/server/guards";
import { BackendError } from "@/lib/server/backend";
import { rejectOrderPayment } from "@/lib/server/orders";

// PATCH /api/orders/:id/reject-payment — vendor rejects a held manual-transfer payment.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  try {
    const order = await rejectOrderPayment(id, gate.cookie);
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof BackendError) return jsonError(err.status, err.message);
    return jsonError(500, "Failed to reject payment.");
  }
}
